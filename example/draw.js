var dmerge = require('deep-assign')
var vtext = require('../')
var regl = require('regl')()

var vt = vtext({ characters: require('./chars.json') })

var text = vt.draw([{text:'HELLO'}], {
  color: [1,1,1,1],
  expand: 1,
  offset: regl.prop('offset'),
  aspect: function (context) {
    return context.viewportWidth / context.viewportHeight
  }
})
var draws = text.map(function (t) { return regl(t.draw) })

regl.frame(function () {
  regl.clear({ color: [0,0,0,1] })
  for (var i = 0; i < draws.length; i++) {
    draws[i](text[i].props)
  }
})
