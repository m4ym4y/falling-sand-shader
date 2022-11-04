function createTexture (gl, sizeX, sizeY) {
  const tex = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  console.log('making texture size', sizeX, sizeY)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    sizeX,
    sizeY,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )

  return tex
}

const vertex_shader = `
  precision mediump float;
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0, 1.0);
  }
`

const sand = [ 246, 215, 176, 255 ]
const wall = [ 127, 127, 127, 255 ]
const empty = [ 0, 0, 0, 255 ]
const fire = [ 255, 0, 0, 255 ]
const fireB1 = [ 204, 51, 51, 255 ]
const fireB2 = [ 153, 51, 51, 255 ]

// TODO: get the passed in scale to work
const fragment_shader = `
  precision highp float;
  uniform sampler2D state;
  // uniform vec2 scale;
  uniform highp float seed;
  #define scale vec2(1024.0, 1024.0)

  // 246,215,176
  #define sand vec4(0.9647058823529412, 0.8431372549019608, 0.6901960784313725, 1.0)
  // 127,127,127
  #define wall vec4(0.4980392156862745, 0.4980392156862745, 0.4980392156862745, 1.0)
  // 0,0,0
  #define empty vec4(0.0, 0.0, 0.0, 1.0)

  // 255, 0, 0
  #define fire vec4(1.0, 0.0, 0.0, 1.0)
  // 204, 0, 0
  #define fire_burnout_1 vec4(0.8, 0.2, 0.2, 1.0)
  // 153, 0, 0
  #define fire_burnout_2 vec4(0.6, 0.2, 0.2, 1.0)

  vec4 get(int x, int y) {
    return vec4(texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / scale));
  }
  
  float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 current = vec4(get(0, 0));

    // down left, up left, center left, etc.
    vec4 ur = vec4(get(1, 1));
    vec4 uc = vec4(get(0, 1));
    vec4 ul = vec4(get(-1, 1));
    vec4 cl = vec4(get(-1, 0));
    vec4 cr = vec4(get(1, 0));
    vec4 dl = vec4(get(-1, -1));
    vec4 dc = vec4(get(0, -1));
    vec4 dr = vec4(get(1, -1));

    bool iswall = current == wall;
    bool sandontop = uc == sand;
    bool onbottom = dc == sand || dc == wall;
    bool issand = current == sand;

    bool isfireadjacent =
      dc == fire ||
      dr == fire ||
      dl == fire ||
      uc == fire ||
      ul == fire ||
      ur == fire ||
      uc == fire;

    if (iswall) {
      gl_FragColor = wall;
    } else {
      if (issand) {
        // particle exposed to fire = fire
        if (isfireadjacent && rand(vec2(gl_FragCoord) * seed) > 0.7) {
          gl_FragColor = fire;
        // particle lands on something = filled
        // particle is not on a corner
        } else if (
          onbottom &&
          (
            uc != empty ||
            dc != sand ||
            (
              (cl != empty || ul != empty || dl != empty) &&
              (cr != empty || ur != empty || dr != empty)
            )
          )
        ) {

          gl_FragColor = sand;
        // particle is falling out of this cell, nothing falling in = empty
        } else {
          gl_FragColor = empty;
        }
      }
      
      // particle is falling into this cell = filled
      else if (sandontop) {
        gl_FragColor = sand;
      }

      else if (current == fire) {
        if (rand(vec2(gl_FragCoord) * (seed + 1.0)) > 0.9) {
          gl_FragColor = fire_burnout_1;
        } else {
          gl_FragColor = fire;
        }
      } else if (current == fire_burnout_1) {
        if (rand(vec2(gl_FragCoord) * (seed + 1.0)) > 0.9) {
          gl_FragColor = fire_burnout_2;
        } else {
          gl_FragColor = fire_burnout_1;
        }
      } else if (current == fire_burnout_2) {
        if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.9) {
          gl_FragColor = empty;
        } else {
          gl_FragColor = fire_burnout_2;
        }
      }

      else if (
        current == empty &&
        uc == empty &&
        dc == empty &&
        ((
          cr == sand &&
          ur == empty &&
          dr == sand
        ) ||
        (
          cl == sand &&
          ul == empty &&
          dl == sand
        ))
      ) {
        gl_FragColor = sand;
      }

      else if (current == empty && dc == fire_burnout_1) {
        if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.2) {
          gl_FragColor = fire_burnout_1;
        } else {
          gl_FragColor = fire_burnout_2;
        }
      }

      // not filled, nothing on bottom
      else {
        gl_FragColor = empty;
      }
    }
  }
`

const fragment_shader_copy = `
  uniform sampler2D state;

  void main() {
    gl_FragColor = texture2D(state, gl_FragCoord.xy);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`

function createShader (gl, source, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('msg: ' + gl.getShaderInfoLog(shader))
  }

  return shader
}

const components = 2
const verts = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
]

function drawQuad (gl, program) {
  const quad = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)

  const attrib = gl.getAttribLocation(program, 'a_position')

  if (attrib < 0) {
    console.error('failed to get location for position attribute')
    return -1
  }

  gl.vertexAttribPointer(attrib, components, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attrib)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / components)
}

function drawState (gl, sizeX, sizeY, texture, copyProgram) {
  gl.useProgram(copyProgram)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, sizeX, sizeY)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  
  /*const state = gl.getUniformLocation(copyProgram, 'state')
  gl.uniform1i(state, 0)*/
  
  drawQuad(gl, copyProgram)
}

function step (gl, stepBuffer, frontTexture, backTexture, sizeX, sizeY, program) {
  gl.useProgram(program)

  gl.bindFramebuffer(gl.FRAMEBUFFER, stepBuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, backTexture, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, frontTexture)

  gl.viewport(0, 0, sizeX, sizeY)

  const state = gl.getUniformLocation(program, 'state')
  gl.uniform1i(state, 0)

  const scale = gl.getUniformLocation(program, 'scale')
  const scaleV = new Float32Array([ sizeX, sizeY ])
  gl.uniform2fv(scale, scaleV)

  const seed = gl.getUniformLocation(program, 'seed')
  gl.uniform1f(seed, Math.random())

  drawQuad(gl, program)
}

function getRandomCells (sizeX, sizeY, concentration, color) {
  const source = new Uint8Array(sizeX * sizeY * 4)
  for (let i = 0; i < sizeX * sizeY; ++i) {
    const pixi = i * 4
    const isAlive = Math.random() < concentration
    const cellColor = isAlive ? color : [ 0, 0, 0, 255 ]
    for (let component = 0; component < 4; ++component) {
      source[pixi + component] = cellColor[component]
    }
  }

  return source
}

function setBorder (source, sizeX, sizeY, color) {
  for (let row = 0; row < sizeY; ++row) {
    for (let col = 0; col < sizeX; ++col) {
      if (row == 0 || col == 0 || row == sizeX - 1 || col == sizeY - 1) {
        const pixi = (row * sizeX + col) * 4
        for (let component = 0; component < 4; component++) {
          source[pixi + component] = color[component]
        }
      }
    }
  }
}

function setRandom (gl, texture, sizeX, sizeY, concentration) {
  const source = getRandomCells(sizeX, sizeY, concentration, sand)
  setBorder(source, sizeX, sizeY, wall)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sizeX, sizeY, gl.RGBA, gl.UNSIGNED_BYTE, source)
}

function getColorArea(w, h, color) {
  const source = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; ++i) {
    const pixi = i * 4
    for (let component = 0; component < 4; ++component) {
      source[pixi + component] = color[component]
    }
  }
  return source
}

async function main () {
  const canvas = document.querySelector('#glCanvas')
  const sizeX = canvas.width
  const sizeY = canvas.height

  const gl = canvas.getContext('webgl')

  if (gl === null) {
    console.error('webgl unsupported')
    return
  }

  let frontTexture = createTexture(gl, sizeX, sizeY)
  let backTexture = createTexture(gl, sizeX, sizeY)

  // simulation program
  const program = gl.createProgram()
  gl.attachShader(program, createShader(gl, vertex_shader, gl.VERTEX_SHADER))
  gl.attachShader(program, createShader(gl, fragment_shader, gl.FRAGMENT_SHADER))
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }

  // copy program for rendering
  const copyProgram = gl.createProgram()
  gl.attachShader(copyProgram, createShader(gl, vertex_shader, gl.VERTEX_SHADER))
  gl.attachShader(copyProgram, createShader(gl, fragment_shader, gl.FRAGMENT_SHADER))
  gl.linkProgram(copyProgram)

  if (!gl.getProgramParameter(copyProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(copyProgram))
  }

  gl.clearColor(0, 0, 0, 1)
  gl.disable(gl.DEPTH_TEST)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const stepBuffer = gl.createFramebuffer()

  setRandom(gl, frontTexture, sizeX, sizeY, 0.2)

  let frames = 0
  setInterval(() => {
    document.querySelector('#fps').innerText = frames
    frames = 0
  }, 1000)

  const brushSize = 10
  const brushes = [
    {
      name: 'sand',
      color: sand
    },
    {
      name: 'wall',
      color: wall
    },
    {
      name: 'fire',
      color: fire
    },
    {
      name: 'erase',
      color: empty
    }
  ]
  let brushType = 0

  const onclick = function (x, y) {
    console.log(brushType, brushes, brushes[brushType])
    gl.bindTexture(gl.TEXTURE_2D, frontTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, sizeY - y, brushSize, brushSize, gl.RGBA, gl.UNSIGNED_BYTE,
      getColorArea(brushSize, brushSize, brushes[brushType].color))
  }

  canvas.addEventListener('mousemove', event => {
    if (event.buttons & 1) {
      console.log('registered move')
      onclick(event.offsetX, event.offsetY)
    }
  })
  
  const showBrush = () => {
    document.getElementById('brush').innerText = brushes[brushType].name
  }

  canvas.addEventListener('contextmenu', ev => ev.preventDefault())
  canvas.addEventListener('mousedown', event => {
    if (event.buttons & 2) {
      event.preventDefault()
      console.log('registered click')
      brushType = (brushType + 1) % brushes.length
      showBrush()
    }
  })

  showBrush()

  const stepsPerDraw = 1
  while (true) {
    for (let i = 0; i < stepsPerDraw; ++i) {
      step(gl, stepBuffer, frontTexture, backTexture, sizeX, sizeY, program)
      const tmp = frontTexture
      frontTexture = backTexture
      backTexture = tmp
    }

    drawState(gl, sizeX, sizeY, frontTexture, copyProgram)
    frames++
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}


window.addEventListener('load', main)
