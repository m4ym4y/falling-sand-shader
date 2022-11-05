import * as Material from './material.js'

export const brushes = [
  {
    name: 'sand',
    color: Material.sand
  },
  {
    name: 'wall',
    color: Material.wall
  },
  {
    name: 'fire',
    color: Material.fire
  },
  {
    name: 'cloner',
    color: Material.cloner
  },
  {
    name: 'metal',
    color: Material.metal
  },
  {
    name: 'lightning',
    color: Material.lightning
  },
  {
    name: 'erase',
    color: Material.empty
  }
]

export class Brush {
  constructor ({
    brushSize,
    brushType
  } = {}) {
    this.brushSize = brushSize || 10
    this.brushType = brushType || 0
  }

  setBrushType (type) {
    this.brushType = type
  }

  setBrushSize (size) {
    this.brushSize = size
  }

  getBrush () {
    return this.brushType
  }

  nextBrush () {
    this.brushType = (this.brushType + 1) % brushes.length
  }

  getBrushName () {
    return brushes[this.brushType].name
  }

  getBrushPixels () {
    const size = Math.pow(this.brushSize, 2)
    const color = brushes[this.brushType].color
    const source = new Uint8Array(size * 4)
    for (let i = 0; i < size; ++i) {
      const pixi = i * 4
      for (let component = 0; component < 4; ++component) {
        source[pixi + component] = color[component]
      }
    }
    return {
      pixels: source,
      w: this.brushSize,
      h: this.brushSize
    }
  }
}
