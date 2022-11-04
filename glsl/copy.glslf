uniform sampler2D state;

void main() {
  gl_FragColor = texture2D(state, gl_FragCoord.xy / 1024.0);
}
