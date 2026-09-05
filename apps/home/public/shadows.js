/** One textured triangle: soft foliage, displaced by a slow, uneven breeze. */
export function createShadows(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });
  if (!gl) throw new Error('WebGL unavailable');
  const shaders = [];
  const program = gl.createProgram();
  function shader(type, source) {
    const value = gl.createShader(type);
    shaders.push(value);
    gl.shaderSource(value, source);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(value));
    gl.attachShader(program, value);
  }
  shader(
    gl.VERTEX_SHADER,
    `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  );
  shader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    uniform sampler2D leaves;
    uniform float time;
    uniform float strength;
    varying vec2 uv;
    void main() {
      float gust = 0.65 + 0.35 * sin(time * 0.37);
      vec2 drift = vec2(
        sin(uv.y * 7.0 + time * 0.61) + 0.35 * sin(uv.y * 13.0 - time * 0.43),
        0.55 * sin(uv.x * 8.0 + time * 0.47)
      ) * 0.012 * strength * gust;
      vec2 p = uv + drift;
      float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
      vec4 leaf = texture2D(leaves, p);
      float light = 1.0 - 0.025 * strength * (0.5 + 0.5 * sin(time * 0.29));
      gl_FragColor = vec4(leaf.rgb, leaf.a * inside * light);
    }
  `,
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));
  shaders.forEach((value) => gl.deleteShader(value));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(gl.getUniformLocation(program, 'leaves'), 0);
  const time = gl.getUniformLocation(program, 'time');
  const strength = gl.getUniformLocation(program, 'strength');
  let ready = false;
  return {
    upload(image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      ready = true;
    },
    draw(seconds, wind, detail) {
      if (!ready || gl.isContextLost()) return;
      const width = Math.max(1, Math.round(1600 * Math.min(detail, 0.75)));
      const height = Math.max(1, Math.round((width * 1400) / 1600));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform1f(time, seconds);
      gl.uniform1f(strength, wind);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
