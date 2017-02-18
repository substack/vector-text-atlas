var defined = require('defined')

module.exports = Atlas

function Atlas (opts) {
  var self = this
  if (!(self instanceof Atlas)) return new Atlas(opts)
  if (!opts) opts = {}
  self.borders = opts.borders || {}
  self.widths = {}
  self.links = {}
  self._options = opts
  if (opts.elementType === 'uint16') {
    self._elementType = Uint16Array
  } else {
    self._elementType = Uint32Array
  }
  self._space = defined(opts.space,0.1)
  self._cdt = opts.cdt
  self._vtext = opts.vtext
  self._attrkv = opts.attributes || {}
  self._attributes = Object.keys(self._attrkv)
    .map(function (key) { return [key,self._attrkv[key]] })

  self._data = opts.data || {}
  Object.keys(self._data).forEach(function (key) {
    Object.keys(self._data[key]).forEach(function (k) {
      var a, d = self._data[key][k]
      if (!Array.isArray(d)) return
      if (k === 'positions') {
        a = self._data[key][k] = new Float32Array(d.length)
      } else if (k === 'cells') {
        a = self._data[key][k] = new(self._elementType)(d.length)
      } else if (k === 'edges') {
        a = self._data[key][k] = new(self._elementType)(d.length)
      } else if (/^(float|vec\d|mat\d)$/.test(self._attrkv[k])) {
        a = self._data[key][k] = new Float32Array(d.length)
      } else if (self._attrkv[k] === 'uint8') {
        a = self._data[key][k] = new Uint8Array(d.length)
      } else if (self._attrkv[k] === 'uint16') {
        a = self._data[key][k] = new Uint16Array(d.length)
      } else if (self._attrkv[k] === 'uint32') {
        a = self._data[key][k] = new Uint32Array(d.length)
      } else if (self._attrkv[k] === 'int8') {
        a = self._data[key][k] = new Int8Array(d.length)
      } else if (self._attrkv[k] === 'int16') {
        a = self._data[key][k] = new Int16Array(d.length)
      } else if (self._attrkv[k] === 'int32') {
        a = self._data[key][k] = new Int32Array(d.length)
      } else {
        throw new Error('unexpected type for key ' + k + ':' + self._attrkv[k])
      }
      for (var i = 0; i < d.length; i++) a[i] = d[i]
    })
  })
}

Atlas.prototype.data = function (format) {
  var self = this
  if (format === 'array') {
    var data = {}
    Object.keys(self._data).forEach(function (key) {
      data[key] = {
        positions: [].slice.call(self._data[key].positions),
        cells: [].slice.call(self._data[key].cells),
        edges: [].slice.call(self._data[key].edges)
      }
      self._attributes.forEach(function (attr) {
        data[attr[0]] = [].slice.call(self._data[key][attr[0]])
      })
    })
    return data
  } else if (format === 'typedarray' || true) {
    return this._data
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
      var m = self._data[c]
      if (!m) throw new Error('character not available: ' + c)
      plen += m.positions.length*2
      clen += m.cells.length*3
    })
  })
  var mesh = self._newMesh(plen,clen)
  var ai = self._attributes.map(function (a) { return 0 })
  var len = 0, ci = 0, pi = 0
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    var xpos = 0
    str.text.split('').forEach(function (c) {
      var w = self._getWidth(c)
      var xoffset = xpos
      xpos += w + self._space
      var m = self._data[c]
      for (var i = 0; i < m.cells.length; i++) {
        mesh.cells[ci++] = len+m.cells[i]
      }
      for (var i = 0; i < m.positions.length; i+=2) {
        mesh.positions[pi++] = m.positions[i+0]+xoffset
        mesh.positions[pi++] = m.positions[i+1]
        self._setAttributes(mesh,str,ai)
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
  var plen = 0, clen = 0
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    str.text.split('').forEach(function (c) {
      var m = self._data[c]
      plen += m.positions.length*2*4
      clen += m.cells.length*3*2
    })
  })
  var mesh = self._newMesh(plen,clen)
  var ai = self._attributes.map(function (a) { return 0 })
  var ci = 0, pi = 0
  var z2 = [0,0]
  var N = [0,0], a0 = [0,0], a1 = [0,0], b0 = [0,0], b1 = [0,0]
  strings.forEach(function (str) {
    if (typeof str === 'string') str = { text: str }
    var xpos = 0
    str.text.split('').forEach(function (c) {
      var w = self._getWidth(c)
      var xoffset = xpos
      xpos += w + self._space
      var m = self._data[c]
      var links = self._getLinks(c)
      for (var i = 0; i < m.edges.length; i+=2) {
        var e0 = m.edges[i]
        var e1 = m.edges[i+1]
        var pa0 = m.positions[e0*2+0]+xoffset
        var pa1 = m.positions[e0*2+1]
        var pb0 = m.positions[e1*2+0]+xoffset
        var pb1 = m.positions[e1*2+1]
        N[0] = pb1-pa1
        N[1] = pa0-pb0
        var ilN = 1/Math.sqrt(N[0]*N[0]+N[1]*N[1])
        N[0] *= ilN
        N[1] *= ilN
        a0[0] = pa0+N[0]*width
        a0[1] = pa1+N[1]*width
        a1[0] = pa0-N[0]*width
        a1[1] = pa1-N[1]*width
        b0[0] = pb0+N[0]*width
        b0[1] = pb1+N[1]*width
        b1[0] = pb0-N[0]*width
        b1[1] = pb1-N[1]*width
        var n = pi*0.5
        mesh.positions[pi++] = a0[0]
        mesh.positions[pi++] = a0[1]
        self._setAttributes(mesh,str,ai)
        mesh.positions[pi++] = a1[0]
        mesh.positions[pi++] = a1[1]
        self._setAttributes(mesh,str,ai)
        mesh.positions[pi++] = b0[0]
        mesh.positions[pi++] = b0[1]
        self._setAttributes(mesh,str,ai)
        mesh.positions[pi++] = b1[0]
        mesh.positions[pi++] = b1[1]
        self._setAttributes(mesh,str,ai)
        mesh.cells[ci++] = n+0
        mesh.cells[ci++] = n+1
        mesh.cells[ci++] = n+2
        mesh.cells[ci++] = n+2
        mesh.cells[ci++] = n+3
        mesh.cells[ci++] = n+1
      }
    })
  })
  return mesh
}

Atlas.prototype._newMesh = function (plen,clen) {
  var data = {
    positions: new Float32Array(plen),
    cells: new(this._elementType)(clen)
  }
  plen *= 0.5
  for (var i = 0; i < this._attributes.length; i++) {
    var key = this._attributes[i][0]
    var type = this._attributes[i][1]
    if (type === 'float') {
      data[key] = new Float32Array(plen)
    } else if (type === 'vec2') {
      data[key] = new Float32Array(plen*2)
    } else if (type === 'vec3') {
      data[key] = new Float32Array(plen*3)
    } else if (type === 'vec4') {
      data[key] = new Float32Array(plen*4)
    } else if (type === 'mat2') {
      data[key] = new Float32Array(plen*4)
    } else if (type === 'mat3') {
      data[key] = new Float32Array(plen*9)
    } else if (type === 'mat4') {
      data[key] = new Float32Array(plen*16)
    } else if (type === 'uint8') {
      data[key] = new Uint8Array(plen)
    } else if (type === 'uint16') {
      data[key] = new Uint16Array(plen)
    } else if (type === 'uint32') {
      data[key] = new Uint32Array(plen)
    }
  }
  return data
}

Atlas.prototype._setAttributes = function (mesh, str, ai) {
  for (var j = 0; j < this._attributes.length; j++) {
    var key = this._attributes[j][0]
    var type = this._attributes[j][1]
    if (type === 'float') {
      mesh[key][ai[j]++] = str[key]
    } else if (type === 'vec2') {
      mesh[key][ai[j]++] = str[key][0]
      mesh[key][ai[j]++] = str[key][1]
    } else if (type === 'vec3') {
      mesh[key][ai[j]++] = str[key][0]
      mesh[key][ai[j]++] = str[key][1]
      mesh[key][ai[j]++] = str[key][2]
    } else if (type === 'vec4' || type === 'mat2') {
      mesh[key][ai[j]++] = str[key][0]
      mesh[key][ai[j]++] = str[key][1]
      mesh[key][ai[j]++] = str[key][2]
      mesh[key][ai[j]++] = str[key][3]
    } else if (type === 'mat3') {
      for (var k = 0; k < 9; k++) {
        mesh[key][ai[j]++] = str[key][k]
      }
    } else if (type === 'mat4') {
      for (var k = 0; k < 16; k++) {
        mesh[key][ai[j]++] = str[key][k]
      }
    } else if (/u?int(8|16|32)$/.test(type)) {
      mesh[key][ai[j]++] = str[key][k]
    }
  }
}

Atlas.prototype.add = function (str) {
  var self = this
  self._setupCanvas()
  if (!self._cdt) throw new Error('must provide opts.cdt to add strings')
  if (!self._vtext) throw new Error('must provide opts.vtext to add strings')
  var chars = str.split('')
  self.ctx.clearRect(0,0,8192,1024)
  chars.forEach(function (c) {
    if (self._data[c]) return
    var m = self._vtext(c, {
      canvas: self.canvas,
      context: self.ctx
    })
    m.cells = self._cdt(m.positions, m.edges, {
      delaunay: false, exterior: false, interior: true
    })
    var data = self._data[c] = {
      positions: new Float32Array(m.positions.length*2),
      cells: new Uint32Array(m.cells.length*3),
      edges: new Uint32Array(m.edges.length*2)
    }
    for (var i = 0; i < m.positions.length; i++) {
      data.positions[i*2+0] = m.positions[i][0]
      data.positions[i*2+1] = -1-m.positions[i][1]
    }
    for (var i = 0; i < m.edges.length; i++) {
      data.edges[i*2+0] = m.edges[i][0]
      data.edges[i*2+1] = m.edges[i][1]
    }
    var ci = 0
    for (var i = 0; i < m.cells.length; i++) {
      data.cells[ci++] = m.cells[i][0]
      data.cells[ci++] = m.cells[i][1]
      data.cells[ci++] = m.cells[i][2]
    }
  })
}

Atlas.prototype._getWidth = function (c) {
  var w = this.widths[c]
  if (!w) {
    var mesh = this._data[c]
    var xmin = Infinity, xmax = -Infinity
    for (var i = 0; i < mesh.positions.length; i+=2) {
      var x = mesh.positions[i]
      xmin = Math.min(xmin,x)
      xmax = Math.max(xmax,x)
    }
    w = this.widths[c] = xmax-xmin
  }
  return w
}

Atlas.prototype._getLinks = function (c) {
  var links = this.links[c]
  if (!links) {
    var mesh = this._data[c]
    links = this.links[c] = {}
    for (var i = 0; i < mesh.edges.length; i++) {
      var e = mesh.edges[i]
      if (!links[e[0]]) links[e[0]] = []
      links[e[0]].push(e[1])
      if (!links[e[1]]) links[e[1]] = []
      links[e[1]].push(e[0])
    }
  }
  return links
}
