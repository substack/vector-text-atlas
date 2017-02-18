var msg = process.argv[2]
var vtext = require('../')
var vt = vtext({
  canvas: require('canvas'),
  vtext: require('vectorize-text'),
  cdt: require('cdt2d')
})
vt.add(msg)
console.log(JSON.stringify(vt.data('array')))
