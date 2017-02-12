var vtext = require('vectorize-text')
var cdt2d = require('cdt2d')
var defined = require('defined')

module.exports = Atlas

function Atlas (opts) {
  if (!(this instanceof Atlas)) return new Atlas(opts)
  if (!opts) opts = {}
  this.characters = opts.characters || {}
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

Atlas.prototype.draw = function (strings, opts) {
  var self = this
  var props = {}
  strings.forEach(function (str) {
    var xpos = 0
    str.text.split('').forEach(function (c) {
      var w = self.widths[c]
      if (!w) {
        var mesh = self.characters[c]
        var xmin = Infinity, xmax = -Infinity
        for (var i = 0; i < mesh.positions.length; i++) {
          var x = mesh.positions[i][0]
          xmin = Math.min(xmin,x)
          xmax = Math.max(xmax,x)
        }
        w = self.widths[c] = xmax-xmin
      }
      if (!props[c]) props[c] = []
      var offset = [0,0]
      if (str.position) {
        offset[0] += str.position[0]
        offset[1] += str.position[1]
      }
      offset[0] += xpos
      props[c].push({ offset: offset })
      xpos += w + 0.04
    })
  })
  return Object.keys(props).map(function (c) {
    var mesh = self.characters[c]
    return {
      draw: {
        frag: `
          precision mediump float;
          uniform vec4 color;
          void main () {
            gl_FragColor = color;
          }
        `,
        vert: `
          precision highp float;
          attribute vec2 position;
          attribute float angle;
          uniform float aspect, expand;
          uniform vec2 offset;
          void main () {
            //float a = angle;
            //vec2 p = (position+vec2(cos(a),sin(a))*expand)*0.04;
            vec2 p = (vec2(position.x,-position.y)+offset)*0.4-vec2(0.5,0.5);
            gl_Position = vec4(vec3(p,0)*vec3(1,aspect,1),1);
          }
        `,
        uniforms: {
          aspect: opts.aspect,
          expand: opts.expand,
          color: opts.color,
          offset: opts.offset
        },
        attributes: {
          position: mesh.positions,
          angle: mesh.angles
        },
        depth: { enable: false, mask: false },
        elements: mesh.cells
      },
      props: props[c]
    }
  })
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
