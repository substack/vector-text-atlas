var vtext = require('vectorize-text')
var cdt2d = require('cdt2d')
var defined = require('defined')

module.exports = Atlas

function Atlas (opts) {
  if (!(this instanceof Atlas)) return new Atlas(opts)
  if (!opts) opts = {}
  this.characters = opts.characters || {}
  this.borders = opts.borders || {}
  this.widths = {}
  this._options = opts
  if (opts.elementType === 'uint16') {
    this._elementType = Uint16Array
  } else {
    this._elementType = Uint32Array
  }
}

Atlas.prototype._setupCanvas = function () {
  if (this.canvas) return
  var opts = this._options
  if (typeof opts.canvas === 'function') {
    this.canvas = new(opts.canvas)(8192,1024)
  } else if (opts.canvas) {
    this.canvas = opts.canvas
  } else if (typeof document !== 'undefined') {
    this.canvas = document.createElement('canvas')
    this.canvas.width = 8192
    this.canvas.height = 1024
  } else {
    throw new Error('opts.canvas required in this environment')
  }
  this.ctx = this.canvas.getContext('2d')
}

Atlas.prototype.fill = function (strings) {
  var self = this
  var plen = 0, clen = 0
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    str.text.split('').forEach(function (c) {
      var m = self.characters[c]
      plen += m.positions.length*2
      clen += m.cells.length*3
    })
  })
  var mesh = {
    positions: new Float32Array(plen),
    cells: new(self._elementType)(clen)
  }
  var len = 0, ci = 0, pi = 0
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    var xpos = 0
    str.text.split('').forEach(function (c) {
      var w = self._getWidth(c)
      var offset = [0,0]
      if (str.position) {
        offset[0] += str.position[0]
        offset[1] += str.position[1]
      }
      offset[0] += xpos
      xpos += w + 0.04
      var m = self.characters[c]
      for (var i = 0; i < m.cells.length; i++) {
        for (var j = 0; j < m.cells[i].length; j++) {
          mesh.cells[ci++] = len+m.cells[i][j]
        }
      }
      for (var i = 0; i < m.positions.length; i++) {
        mesh.positions[pi++] = m.positions[i][0]+offset[0]
        mesh.positions[pi++] = m.positions[i][1]+offset[1]
        len++
      }
    })
  })
  return mesh
}

Atlas.prototype.stroke = function (strings, opts) {
  var self = this
  if (!opts) opts = {}
  var width = defined(opts.width, 0.04)
  var mesh = {
    positions: [],
    cells: []
  }
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    var xpos = 0
    str.text.split('').forEach(function (c) {
      var w = self._getWidth(c)
      var offset = [0,0]
      if (str.position) {
        offset[0] += str.position[0]
        offset[1] += str.position[1]
      }
      offset[0] += xpos
      xpos += w + 0.04
      var m = self.characters[c]
      for (var i = 0; i < m.edges.length; i++) {
        var e = m.edges[i]
        var a = m.positions[e[0]]
        var b = m.positions[e[1]]
        var N = [b[1]-a[1],a[0]-b[0]]
        var ilN = 1/Math.sqrt(N[0]*N[0]+N[1]*N[1])
        N[0] *= ilN
        N[1] *= ilN
        var a0 = [a[0]+offset[0]+N[0]*width,a[1]+offset[1]+N[1]*width]
        var a1 = [a[0]+offset[0]-N[0]*width,a[1]+offset[1]-N[1]*width]
        var b0 = [b[0]+offset[0]+N[0]*width,b[1]+offset[1]+N[1]*width]
        var b1 = [b[0]+offset[0]-N[0]*width,b[1]+offset[1]-N[1]*width]
        var n = mesh.positions.length
        mesh.positions.push(a0,a1,b0,b1)
        mesh.cells.push(n,n+1,n+2,n+2,n+3,n+1)
      }
    })
  })
  return mesh
}

Atlas.prototype.add = function (str) {
  var self = this
  self._setupCanvas()
  var chars = str.split('')
  self.ctx.clearRect(0,0,8192,1024)
  chars.forEach(function (c) {
    if (self.characters[c]) return
    var m = self.characters[c] = vtext(c, {
      canvas: self.canvas,
      context: self.ctx
    })
    m.cells = cdt2d(m.positions, m.edges, {
      delaunay: false, exterior: false, interior: true
    })
    var links = {}
    for (var i = 0; i < m.positions.length; i++) {
      m.positions[i][1] = -1-m.positions[i][1]
    }
    for (var i = 0; i < m.edges.length; i++) {
      var edge = m.edges[i]
      if (!links[edge[0]]) links[edge[0]] = []
      if (!links[edge[1]]) links[edge[1]] = []
      links[edge[0]].push(edge[1])
      links[edge[1]].push(edge[0])
    }
  })
}

Atlas.prototype._getWidth = function (c) {
  var w = this.widths[c]
  if (!w) {
    var mesh = this.characters[c]
    var xmin = Infinity, xmax = -Infinity
    for (var i = 0; i < mesh.positions.length; i++) {
      var x = mesh.positions[i][0]
      xmin = Math.min(xmin,x)
      xmax = Math.max(xmax,x)
    }
    w = this.widths[c] = xmax-xmin
  }
  return w
}
