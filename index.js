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

Atlas.prototype.mesh = function (strings, opts) {
  var self = this
  var mesh = { positions: [], cells: [] }
  var len = 0
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
          mesh.cells.push(len+m.cells[i][j])
        }
      }
      for (var i = 0; i < m.positions.length; i++) {
        mesh.positions.push(m.positions[i][0]+offset[0])
        mesh.positions.push(-1-m.positions[i][1]+offset[1])
        len++
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
