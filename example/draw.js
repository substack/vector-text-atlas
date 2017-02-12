var dmerge = require('deep-assign')
var vtext = require('../')
var regl = require('regl')()

var vt = vtext({ characters: require('./chars.json') })

var draw = regl(vt.draw('HELLO', {
  color: [1,1,1,1],
  expand: 1,
  aspect: function (context) {
    return context.viewportWidth / context.viewportHeight
  }
}))
regl.frame(function () {
  regl.clear({ color: [0,0,0,1] })
  draw()
})
