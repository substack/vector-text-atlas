var dmerge = require('deep-assign')
var vtext = require('../')
var regl = require('regl')({ extensions: [ 'oes_element_index_uint' ] })

var vt = vtext({ characters: require('./chars.json') })
var mesh = vt.mesh([{text:'HELLO'}])
var draw = regl({
  frag: `
    precision highp float;
    void main () {
      gl_FragColor = vec4(1,1,1,1);
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
  attributes: {
    position: mesh.positions
  },
  elements: mesh.cells,
  uniforms: {
    aspect: function (context) {
      return context.viewportWidth / context.viewportHeight
    }
  }
})
regl.frame(function () {
  regl.clear({ color: [0,0,0,1] })
  draw()
})
