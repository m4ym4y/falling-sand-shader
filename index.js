import { Brush, brushes } from './src/brush.js'
import * as Material from './src/material.js'
import { GlHelper } from './src/gl.js'

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

function setRandom (glh, texture, concentration) {
  const source = getRandomCells(glh.sizeX, glh.sizeY, concentration, Material.dust)
  setBorder(source, glh.sizeX, glh.sizeY, Material.wall)

  glh.subImage(texture, source)
}

function setUpTools (brush) {
  const brushesDiv = document.getElementById('brush-buttons')

  for (let i = 0; i < brushes.length; ++i) {
    const button = document.createElement('button')

    button.classList.add('brush-button')
    button.innerText = brushes[i].name

    if (i === brush.getBrush()) {
      button.setAttribute('disabled', true)
    }

    button.addEventListener('click', ev => {
      ev.preventDefault()
      brush.setBrushType(i)

      brushesDiv.querySelectorAll('.brush-button').forEach(b => {
        b.removeAttribute('disabled')
      })
      button.setAttribute('disabled', true)
    })

    brushesDiv.appendChild(button)
  }

  const brushSize = document.getElementById('brush-size')
  brushSize.value = brush.getBrushSize()

  brushSize.addEventListener('change', ev => {
    const value = Number(ev.target.value)

    if (value >= 1 && value <= 50) {
      brush.setBrushSize(value)
    }
  })
}

async function loadShader (url) {
  const request = await fetch(url)
  const text = await request.text()

  return text
}

async function main () {
  const canvas = document.querySelector('#glCanvas')

  const glh = new GlHelper(canvas)

  // state is drawn between front and back textures each step
  let frontTexture = glh.createTexture()
  let backTexture = glh.createTexture()

  const vertexShader = await loadShader('./glsl/vertex.glslv')
  const fragmentShader = await loadShader('./glsl/sand.glslf')
  const fragmentShaderCopy = await loadShader('./glsl/copy.glslf')
  console.log(fragmentShader)

  // simulation program
  const program = glh.createProgram({ vertexShader, fragmentShader })

  // copy program which renders state to screen
  const copyProgram = glh.createProgram({ vertexShader, fragmentShader: fragmentShaderCopy })

  glh.setup()
  setRandom(glh, frontTexture, 0.2)

  const brush = new Brush()

  const onclick = function (x, y) {
    const pixels = brush.getBrushPixels()
    glh.subImage(frontTexture, pixels.pixels, x, glh.sizeY - y, pixels.w, pixels.h)
  }

  canvas.addEventListener('contextmenu', ev => ev.preventDefault())
  canvas.addEventListener('mousemove', event => {
    if (event.buttons & 1) {
      onclick(event.offsetX, event.offsetY)
    }
  })

  setUpTools(brush)

  const stepsPerDraw = 1

  let frames = 0
  let delay = 0
  setInterval(() => {
    document.querySelector('#fps').innerText = frames
    frames = 0
  }, 1000)


  while (true) {
    for (let i = 0; i < stepsPerDraw; ++i) {
      glh.renderFrontToBackTexture(program, frontTexture, backTexture)

      // swap textures after each step
      const tmp = frontTexture
      frontTexture = backTexture
      backTexture = tmp
    }

    glh.renderTextureToDisplay(copyProgram, frontTexture)

    frames++
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

window.addEventListener('load', main)
