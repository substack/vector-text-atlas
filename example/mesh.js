var msg = process.argv[2]
var vtext = require('../')({ canvas: require('canvas') })
vtext.add(msg)
console.log(JSON.stringify(vtext.characters))
