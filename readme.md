# vector-text-atlas

generate meshes for text rendering offline per-character to save space and
resassemble the complete mesh at runtime on the client

# example

first add a string and save the character data to a file:

``` js
var msg = process.argv[2]
var vtext = require('vector-text-atlas')
var vt = vtext({ canvas: require('canvas') })
vt.add(msg)
console.log(JSON.stringify(vt.data))
```

``` sh
$ node mesh.js HELLO > data.json
```

The mesh data is in simplicial complex format. You can plot this data with your
favorite 3d engine:

``` js
var vtext = require('vector-text-atlas')
var assign = require('deep-assign')
var regl = require('regl')({ extensions: [ 'oes_element_index_uint' ] })

var vt = vtext({ data: require('./data.json') })
var strings = [ 'HELLO' ]
var fill = vt.fill(strings)
var stroke = vt.stroke(strings, { width: 0.04 })

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
  draw.fill()
})
```

# api

```
var vtext = require('vector-text-atlas')
```

## var vt = vtext(opts)

* `opts.data` - set character mesh data

## vt.add(str)

Generate mesh data for the characters in the string `str`.

## vt.data

Per-character mesh data. You can save this data to a file and load it via
`opts.data`.

## var mesh = vt.fill(strings)

Return simplicial complex for the triangles and vertices that fill an array of
`strings`.

Each string object `str` in `strings`:

* `str.text` - string to render
* `str.position` - position of the string

## var mesh = vt.stroke(strings, opts)

Return simplicial complex for the triangles and vertices that stroke the border
region of an array of `strings`.

Each string object `str` in `strings`:

* `str.text` - string to render
* `str.position` - position of the string

Optionally set:

* `opts.width` - border width. default: 0.04

# todo

* mitre joins

# install

```
npm install vector-text-atlas
```

# license

BSD
