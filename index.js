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

const sand = [ 246, 215, 176, 255 ]
const wall = [ 127, 127, 127, 255 ]
const empty = [ 0, 0, 0, 255 ]
const fire = [ 255, 0, 0, 255 ]
const fireB1 = [ 204, 51, 51, 255 ]
const fireB2 = [ 153, 51, 51, 255 ]
const cloner = [ 111, 78, 55, 255 ]
const metal = [ 129, 133, 137, 255 ]
const lightning = [ 255, 230, 0, 255 ]

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

let quad
function drawQuad (gl, program) {
  if (!quad) {
    quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  }

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

async function loadShader (url) {
  const request = await fetch(url)
  const text = await request.text()

  return text
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

  const vertexShader = await loadShader('./glsl/vertex.glslv')
  const fragmentShader = await loadShader('./glsl/sand.glslf')
  const fragmentShaderCopy = await loadShader('./glsl/copy.glslf')

  console.log(fragmentShader)

  // simulation program
  const program = gl.createProgram()
  gl.attachShader(program, createShader(gl, vertexShader, gl.VERTEX_SHADER))
  gl.attachShader(program, createShader(gl, fragmentShader, gl.FRAGMENT_SHADER))
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }

  // copy program for rendering
  const copyProgram = gl.createProgram()
  gl.attachShader(copyProgram, createShader(gl, vertexShader, gl.VERTEX_SHADER))
  gl.attachShader(copyProgram, createShader(gl, fragmentShaderCopy, gl.FRAGMENT_SHADER))
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
      name: 'cloner',
      color: cloner
    },
    {
      name: 'metal',
      color: metal
    },
    {
      name: 'lightning',
      color: lightning
    },
    {
      name: 'erase',
      color: empty
    }
  ]
  let brushType = 0

  const onclick = function (x, y) {
    gl.bindTexture(gl.TEXTURE_2D, frontTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, sizeY - y, brushSize, brushSize, gl.RGBA, gl.UNSIGNED_BYTE,
      getColorArea(brushSize, brushSize, brushes[brushType].color))
  }

  canvas.addEventListener('mousemove', event => {
    if (event.buttons & 1) {
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
