var vtext = require('vectorize-text')
var cdt2d = require('cdt2d')
var defined = require('defined')

module.exports = Atlas

function Atlas (opts) {
  if (!(this instanceof Atlas)) return new Atlas(opts)
  if (!opts) opts = {}
  this.characters = opts.characters || {}
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

Atlas.prototype.draw = function (str, opts) {
  var mesh = this.mesh(str,opts)
  return {
    frag: `
      precision mediump float;
      uniform vec4 color;
      void main () {
        gl_FragColor = color;
      }
    `,
    vert: `
      precision highp float;
      attribute vec2 position, offset;
      attribute float angle;
      uniform float aspect, expand;
      void main () {
        float a = angle;
        vec2 p = (position+vec2(cos(a),sin(a))*expand)*0.04;
        gl_Position = vec4(vec3(p,0)*vec3(1,aspect,1),1);
      }
    `,
    uniforms: {
      aspect: opts.aspect,
      expand: opts.expand,
      color: opts.color
    },
    attributes: {
      position: mesh.positions,
      angle: mesh.angles,
      offset: mesh.offsets
    },
    depth: { enable: false, mask: false },
    elements: mesh.cells
  }
}

Atlas.prototype.mesh = function (str, opts) {
  var self = this
  if (!opts) opts = {}
  var pos = opts.position || [0,0]
  var mesh = { positions: [], cells: [], offsets: [], angles: [] }
  var widths = {}
  var theta = (Math.PI*5/2 + (opts.theta || 0)) % Math.PI - Math.PI/2
  var chars = str.split('')
  var width = 0
  chars.forEach(function (c) {
    var m = self.characters[c]
    for (var i = 0; i < m.cells.length; i++) {
      var c = m.cells[i]
      mesh.cells.push(c.map(function (x) {
        return x+mesh.positions.length
      }))
    }
    var xmin = Infinity, xmax = -Infinity
    var space = 0.2
    for (var i = 0; i < m.positions.length; i++) {
      var p = m.positions[i]
      xmin = Math.min(xmin,p[0])
      xmax = Math.max(xmax,p[0])
      var x = p[0]+width+space*0.5
      var y = -p[1]-1.2
      var xr = x*Math.cos(theta)-y*Math.sin(theta)
      var yr = x*Math.sin(theta)+y*Math.cos(theta)
      mesh.positions.push([xr,yr])
      mesh.offsets.push(pos)
      mesh.angles.push(m.angles[i])
    }
    if (!widths[c] && xmax > -Infinity) {
      widths[c] = xmax-xmin
    } else if (!widths[c]) widths[c] = 0.75
    width += widths[c] + space
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
    m.angles = new Array(m.positions.length)
    for (var i = 0; i < m.positions.length; i++) {
      var ai = defined(links[i][0],i)
      var bi = defined(links[i][1],i)
      var a = m.positions[ai]
      var b = m.positions[bi]
      m.angles[i] = Math.atan2(a[1]-b[1],a[0]-b[0])
    }
    delete m.edges
  })
}
