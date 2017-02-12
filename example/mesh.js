var msg = process.argv[2]
var vtext = require('../')
var vt = vtext({ canvas: require('canvas') })
vt.add(msg)
console.log(JSON.stringify(vt.characters))
