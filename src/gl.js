// for drawing full screen quad
const components = 2
const verts = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
]

export class GlHelper {
  constructor (canvas) {
    this.gl = canvas.getContext('webgl')
    this.sizeX = canvas.width
    this.sizeY = canvas.height

    if (!this.gl) {
      throw new Error('webgl is unsupported')
    }
  }

  createTexture () {
    const gl = this.gl
    const tex = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.sizeX,
      this.sizeY,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )

    return tex
  }

  createShader (source, type) {
    const gl = this.gl

    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('msg: ' + gl.getShaderInfoLog(shader))
    }

    return shader
  }

  createProgram ({ vertexShader, fragmentShader }) {
    const gl = this.gl

    const program = gl.createProgram()
    gl.attachShader(program, this.createShader(vertexShader, gl.VERTEX_SHADER))
    gl.attachShader(program, this.createShader(fragmentShader, gl.FRAGMENT_SHADER))
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program))
    }

    return program
  }

  setup () {
    const gl = this.gl

    gl.clearColor(0, 0, 0, 1)
    gl.disable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  subImage (texture, pixels, offsetX = 0, offsetY = 0, sizeX = this.sizeX, sizeY = this.sizeY) {
    const gl = this.gl

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0,
      offsetX, offsetY,
      sizeX, sizeY,
      gl.RGBA, gl.UNSIGNED_BYTE,
      pixels
    )
  }

  drawQuad (program) {
    const gl = this.gl

    if (!this.quad) {
      this.quad = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    }

    // TODO: a way to not hard-code this vertex shader attribute?
    const attrib = gl.getAttribLocation(program, 'a_position')
    if (attrib < 0) {
      console.error('failed to get location for position attribute')
      return -1
    }

    gl.vertexAttribPointer(attrib, components, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(attrib)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / components)
  }

  renderTextureToDisplay (program, texture) {
    const gl = this.gl

    gl.useProgram(program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.sizeX, this.sizeY)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    
    // TODO: a way to not hard-code uniforms?
    const state = gl.getUniformLocation(program, 'state')
    gl.uniform1i(state, 0)
    
    this.drawQuad(program)
  }

  renderFrontToBackTexture (program, frontTexture, backTexture) {
    const gl = this.gl

    if (!this.stepBuffer) {
      this.stepBuffer = gl.createFramebuffer()
    }

    gl.useProgram(program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stepBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, backTexture, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, frontTexture)

    gl.viewport(0, 0, this.sizeX, this.sizeY)

    // TODO: a way to not hard-code uniforms?
    // maybe they could be specified along with the creation of programs...
    const state = gl.getUniformLocation(program, 'state')
    gl.uniform1i(state, 0)

    const scale = gl.getUniformLocation(program, 'scale')
    const scaleV = new Float32Array([ this.sizeX, this.sizeY ])
    gl.uniform2fv(scale, scaleV)

    const seed = gl.getUniformLocation(program, 'seed')
    gl.uniform1f(seed, Math.random())

    this.drawQuad(program)
  }
}
