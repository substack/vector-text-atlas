var vtext = require('../')
var assign = require('deep-assign')
var regl = require('regl')({ extensions: [ 'oes_element_index_uint' ] })

var vt = vtext({ characters: require('./chars.json') })
var strings = [ 'HELLO' ]
var fill = vt.fill(strings)
var stroke = vt.stroke(strings, { width: 0.1 })

var opts = {
  frag: `
    precision highp float;
    uniform vec3 color;
    void main () {
      gl_FragColor = vec4(color,1);
    }
  `,
  vert: `
    precision highp float;
    attribute vec2 position;
    uniform float aspect;
    void main () {
      gl_Position = vec4(position*vec2(1,aspect)*0.2,0,1);
    }
  `,
  uniforms: {
    aspect: function (context) {
      return context.viewportWidth / context.viewportHeight
    }
  },
  depth: { mask: false, enable: false }
}
var draw = {
  fill: regl(assign({}, opts, {
    attributes: { position: fill.positions },
    elements: fill.cells,
    uniforms: { color: [1,1,1] }
  })),
  stroke: regl(assign({}, opts, {
    attributes: { position: stroke.positions },
    elements: stroke.cells,
    uniforms: { color: [1,0,0] }
  }))
}
regl.frame(function () {
  regl.clear({ color: [0,0,0,1] })
  draw.stroke()
  //draw.fill()
})
