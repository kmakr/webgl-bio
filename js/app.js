const CLASS_NAMES = {
  noTouchAction: 'no-touch-action',
  panel: 'panel',
  content: 'content',
  contentMaster: 'content-master',
  isActive: 'is-active',
  isNarrow: 'is-narrow',
  isSelection: 'is-selection'
};

const HEATMAP_RESOLUTION = 512;
const MAX_TOUCH_POINTS = 11;

const FULLSCREEN_VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vUv = (aPosition + 1.0) / 2.0;
}
`;

const HEATMAP_FRAGMENT_SHADER = `
precision mediump float;

const float BASE_DAMPING = 1.0;
const float CONTACT_DAMPING = 0.72;
const float STIFFNESS = 1.0;
const float TOUCH_FORCE = 300.0;
const float TOUCH_BASELINE = 0.0;
const float VELOCITY_LIMIT = 1.0;

uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform vec2 uTouchPoints[${MAX_TOUCH_POINTS}];
uniform float uDeltaTime;

varying vec2 vUv;

void main() {
  vec4 sample = texture2D(uTexture, vUv);
  float height = sample.r;
  float velocity = sample.g;
  float acceleration = 0.0;
  float touchWeight = 0.0;

  for (int i = 0; i < ${MAX_TOUCH_POINTS}; i++) {
    vec2 rawPoint = uTouchPoints[i] * uResolution;
    if (rawPoint.x > 0.0 && rawPoint.y > 0.0) {
      vec2 pixel = vUv * uResolution;
      float distance = length(pixel - rawPoint);
      if (distance < 100.0) {
        float normalized = distance / 100.0;
        float falloff = pow(1.0 - normalized, 20.0) * (21.0 - 20.0 * (1.0 - normalized));
        touchWeight += falloff;
        float touchInfluence = -(height - VELOCITY_LIMIT) * mix(0.0, TOUCH_FORCE, falloff);
        acceleration += touchInfluence;
      }
    }
  }

  touchWeight = clamp(touchWeight, 0.0, 1.0);

  float restoringForce = -(height - TOUCH_BASELINE) * STIFFNESS;
  float damping = -sign(velocity) * mix(BASE_DAMPING, CONTACT_DAMPING, touchWeight) * velocity * velocity;

  acceleration += damping;
  acceleration += restoringForce;

  velocity += acceleration * uDeltaTime;
  height += velocity * uDeltaTime;

  gl_FragColor = vec4(height, velocity, 1.0, 1.0);
}
`;

const GAUSSIAN_BLUR_FRAGMENT_SHADER = `
precision mediump float;

uniform highp float uWeights[3];
uniform sampler2D uTexture;
uniform vec2 uPixelSize;
uniform vec2 uDirection;

varying highp vec2 vUv;

void main() {
  vec4 sum = texture2D(uTexture, vUv) * (uWeights[0] + 2.0);

  for (int i = 1; i < 3; i++) {
    float offset = float(i);
    sum += texture2D(uTexture, vUv + uPixelSize * offset * uDirection) * uWeights[i];
    sum += texture2D(uTexture, vUv - uPixelSize * offset * uDirection) * uWeights[i];
  }

  gl_FragColor = sum / 3.0;
}
`;

const SELECTION_VERTEX_SHADER = `
attribute float aIndex;
uniform vec4 uCoords;

varying vec2 vUv;

void main() {
  vec2 position;

  if (aIndex < 0.5) {
    position = uCoords.rg;
  } else if (aIndex < 1.5) {
    position = uCoords.bg;
  } else if (aIndex < 2.5) {
    position = uCoords.ra;
  } else {
    position = uCoords.ba;
  }

  gl_Position = vec4(position, 0.0, 1.0);
  vUv = vec2(0.5) + position * 0.5;
}
`;

const SIMPLE_TEXTURE_FRAGMENT_SHADER = `
uniform highp sampler2D uTexture;

varying highp vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;

const FINAL_FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 uHeatMapResolution;
uniform highp sampler2D uTexture;
uniform sampler2D uHeatMap;
uniform float uAmplitude;
uniform float uWavelength;
uniform float uTime;

varying highp vec2 vUv;

void main() {
  vec2 sineOffset = vec2(0.0, sin(uWavelength * (vUv.x - uTime)) * uAmplitude);
  vec2 texel = 1.0 / uHeatMapResolution;

  float up = texture2D(uHeatMap, vec2(vUv.x, vUv.y - texel.y * 0.5)).r;
  float down = texture2D(uHeatMap, vec2(vUv.x, vUv.y + texel.y * 0.5)).r;
  float left = texture2D(uHeatMap, vec2(vUv.x - texel.x * 0.5, vUv.y)).r;
  float right = texture2D(uHeatMap, vec2(vUv.x + texel.x * 0.5, vUv.y)).r;

  vec2 gradient = vec2(right - left, down - up) / 0.5;
  vec2 displacedUv = vUv + gradient * gradient * sign(gradient) * 4.0;

  float center = texture2D(uHeatMap, vUv).r;

  vec4 red = texture2D(uTexture, displacedUv + sineOffset + vec2(center * texel.x * 0.0, 0.0));
  vec4 blue = texture2D(uTexture, displacedUv + sineOffset + vec2(center * texel.x * 2.0, 0.0));
  vec4 green = texture2D(uTexture, displacedUv + sineOffset + vec2(center * texel.x * 4.0, 0.0));

  gl_FragColor = vec4(red.r, blue.b, green.g, 1.0);
}
`;

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error('Failed to initialise experience', error);
  });
});

async function bootstrap() {
  if (typeof SVGForeignObjectElement === 'undefined') {
    return;
  }

  const panel = document.querySelector(`.${CLASS_NAMES.panel}`);
  const content = document.querySelector(`.${CLASS_NAMES.content}`);

  if (!panel || !content) {
    return;
  }

  const cssText = await loadCssText();
  const gl = createGlContext(panel);

  if (!gl) {
    return;
  }

  const floatSupport = detectFloatTextureSupport(gl);

  if (!floatSupport) {
    panel.removeChild(gl.canvas);
    return;
  }

  const quadBuffer = createFullscreenQuadBuffer(gl);
  const panelMetrics = measurePanel(panel);
  panelMetrics.el = panel;

  const svgFactory = createSvgFactory({ canvas: gl.canvas, cssText, contentElement: content });
  const [contentImage, selectionImage] = await Promise.all([
    svgFactory.render(false),
    svgFactory.render(true)
  ]);

  const selectionRenderer = createSelectionRenderer(gl, panelMetrics, contentImage, selectionImage);
  const heatmap = createHeatmapSimulator(gl, quadBuffer, panelMetrics, floatSupport);

  startAnimationLoop({
    gl,
    quadBuffer,
    panelMetrics,
    heatmap,
    selectionRenderer,
    svgFactory,
    content
  });
}

async function loadCssText() {
  try {
    const response = await fetch('./styles.css', { cache: 'no-store' });
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    // fall back to inline cache
  }

  const fallback = document.getElementById('svg-style-source');
  if (fallback) {
    return fallback.textContent.trim();
  }

  throw new Error('Unable to load styles.css');
}

function createGlContext(panel) {
  const canvas = document.createElement('canvas');
  panel.appendChild(canvas);

  const attributes = { antialias: false };
  const gl =
    canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes);

  if (!gl) {
    panel.removeChild(canvas);
    return null;
  }

  gl.clearColor(1, 1, 1, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  resizeDrawingSurface(gl);

  return gl;
}

function resizeDrawingSurface(gl) {
  const { canvas } = gl;
  const width = canvas.offsetWidth * window.devicePixelRatio;
  const height = canvas.offsetHeight * window.devicePixelRatio;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function detectFloatTextureSupport(gl) {
  const result = { type: null, arrayType: Float32Array };

  const canRenderType = (type) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);

    return status === gl.FRAMEBUFFER_COMPLETE;
  };

  const floatExtension = gl.getExtension('OES_texture_float');
  const floatLinear = floatExtension && gl.getExtension('OES_texture_float_linear');

  if (floatExtension && floatLinear && canRenderType(gl.FLOAT)) {
    result.type = gl.FLOAT;
    return result;
  }

  const halfFloatExtension = gl.getExtension('OES_texture_half_float');
  const halfFloatLinear = halfFloatExtension && gl.getExtension('OES_texture_half_float_linear');

  if (halfFloatExtension && halfFloatLinear && canRenderType(halfFloatExtension.HALF_FLOAT_OES)) {
    result.type = halfFloatExtension.HALF_FLOAT_OES;
    result.arrayType = Uint16Array;
    return result;
  }

  return null;
}

function createFullscreenQuadBuffer(gl) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

function createSvgFactory({ canvas, cssText, contentElement }) {
  const encodeSvg = (svgMarkup) => {
    try {
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(svgMarkup);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }
    } catch (error) {
      console.warn('Falling back to legacy SVG encoder', error);
    }

    // Legacy path for browsers without TextEncoder support.
    return btoa(unescape(encodeURIComponent(svgMarkup)));
  };

  const buildMarkup = (withSelection) => {
    const classes = [CLASS_NAMES.content, CLASS_NAMES.contentMaster];
    if (withSelection) {
      classes.push(CLASS_NAMES.isSelection);
    }
    if (window.matchMedia('(max-width: 512px)').matches) {
      classes.push(CLASS_NAMES.isNarrow);
    }

    const viewWidth = canvas.offsetWidth;
    const viewHeight = canvas.offsetHeight;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${viewWidth} ${viewHeight}">
        <rect width="101%" height="101%" fill="white" />
        <foreignObject width="${viewWidth}" height="${viewHeight}">
          <style>
            ${cssText}
          </style>
          <div xmlns="http://www.w3.org/1999/xhtml" class="${classes.join(' ')}">
            ${contentElement.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

  const render = async (withSelection) => {
    const svgMarkup = buildMarkup(withSelection);
    const dataUri = `data:image/svg+xml;base64,${encodeSvg(svgMarkup)}`;
    const image = await loadImage(dataUri);
    image.width = canvas.width;
    image.height = canvas.height;
    return image;
  };

  return { render };
}

function createTextureFromImage(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function updateTextureFromImage(gl, texture, image) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failure: ${info}`);
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failure: ${info}`);
  }

  return program;
}

function createHeatmapSimulator(gl, quadBuffer, panelMetrics, floatSupport) {
  const touchPoints = new Float32Array(MAX_TOUCH_POINTS * 2);
  touchPoints.fill(-1);

  const panel = panelMetrics.el;
  const initialData = new floatSupport.arrayType(HEATMAP_RESOLUTION * HEATMAP_RESOLUTION * 4);

  const simulationProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, HEATMAP_FRAGMENT_SHADER);
  const blurProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, GAUSSIAN_BLUR_FRAGMENT_SHADER);

  const simulationPosition = gl.getAttribLocation(simulationProgram, 'aPosition');
  const simulationResolution = gl.getUniformLocation(simulationProgram, 'uResolution');
  const simulationTexture = gl.getUniformLocation(simulationProgram, 'uTexture');
  const simulationTouchPoints = gl.getUniformLocation(simulationProgram, 'uTouchPoints');
  const simulationDeltaTime = gl.getUniformLocation(simulationProgram, 'uDeltaTime');

  const blurPosition = gl.getAttribLocation(blurProgram, 'aPosition');
  const blurWeights = gl.getUniformLocation(blurProgram, 'uWeights');
  const blurTexture = gl.getUniformLocation(blurProgram, 'uTexture');
  const blurPixelSize = gl.getUniformLocation(blurProgram, 'uPixelSize');
  const blurDirection = gl.getUniformLocation(blurProgram, 'uDirection');

  const pingPong = [];
  for (let index = 0; index < 2; index += 1) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      HEATMAP_RESOLUTION,
      HEATMAP_RESOLUTION,
      0,
      gl.RGBA,
      floatSupport.type,
      initialData
    );

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    pingPong.push({ texture, framebuffer });
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  let previousIndex = 0;
  const gaussianWeights = new Float32Array([0.3225806451612904, 0.2419354838709677, 0.0967741935483871]);

  panel.addEventListener('dragstart', (event) => event.preventDefault());

  if (typeof PointerEvent !== 'undefined' && typeof TouchList === 'undefined') {
    document.body.classList.add(CLASS_NAMES.noTouchAction);
    const activePointers = [];

    const updatePointerUniform = () => {
      const limit = Math.min(activePointers.length, MAX_TOUCH_POINTS);
      let offset = 0;
      for (; offset < limit; offset += 1) {
        const pointer = activePointers[offset];
        touchPoints[offset * 2] = (pointer.pageX - panelMetrics.left) / panelMetrics.width;
        touchPoints[offset * 2 + 1] = 1 - (pointer.pageY - panelMetrics.top) / panelMetrics.height;
      }
      for (; offset < MAX_TOUCH_POINTS; offset += 1) {
        touchPoints[offset * 2] = -1;
        touchPoints[offset * 2 + 1] = -1;
      }
    };

    panel.addEventListener('pointerdown', (event) => {
      if (typeof panel.setPointerCapture === 'function') {
        try {
          panel.setPointerCapture(event.pointerId);
        } catch (error) {
          // Ignore browsers that do not support pointer capture.
        }
      }
      activePointers.push({ id: event.pointerId, pageX: event.pageX, pageY: event.pageY });
      updatePointerUniform();
    });

    panel.addEventListener('pointermove', (event) => {
      for (let index = 0; index < activePointers.length; index += 1) {
        const pointer = activePointers[index];
        if (pointer.id === event.pointerId) {
          pointer.pageX = event.pageX;
          pointer.pageY = event.pageY;
          updatePointerUniform();
          break;
        }
      }

      if (event.isPrimary && event.pointerType === 'touch') {
        document.body.scrollTop += -event.movementY;
      }
    });

    const removePointer = (event) => {
      for (let index = 0; index < activePointers.length; index += 1) {
        if (activePointers[index].id === event.pointerId) {
          activePointers.splice(index, 1);
          updatePointerUniform();
          break;
        }
      }
    };

    panel.addEventListener('pointerup', removePointer);
    panel.addEventListener('pointercancel', removePointer);
  } else {
    const updateFromTouches = (touches) => {
      const limit = Math.min(touches.length, MAX_TOUCH_POINTS - 1);
      let offset = 0;
      for (; offset < limit; offset += 1) {
        const touch = touches.item(offset);
        touchPoints[offset * 2] = (touch.pageX - panelMetrics.left) / panelMetrics.width;
        touchPoints[offset * 2 + 1] = 1 - (touch.pageY - panelMetrics.top) / panelMetrics.height;
      }
      for (; offset < MAX_TOUCH_POINTS - 1; offset += 1) {
        touchPoints[offset * 2] = -1;
        touchPoints[offset * 2 + 1] = -1;
      }
    };

    let touchStartY = 0;
    let guardScrollTop = false;

    panel.addEventListener('touchstart', (event) => {
      if (event.touches.length > 0) {
        touchStartY = event.touches[0].clientY;
        guardScrollTop = document.body.scrollTop === 0;
      }
      updateFromTouches(event.touches);
    });

    panel.addEventListener('touchmove', (event) => {
      if (guardScrollTop) {
        const delta = event.touches[0].clientY - touchStartY;
        if (delta > 0) {
          event.preventDefault();
          guardScrollTop = false;
        }
      }
      updateFromTouches(event.touches);
    }, { passive: false });

    panel.addEventListener('touchend', (event) => updateFromTouches(event.touches));
    panel.addEventListener('touchcancel', (event) => updateFromTouches(event.touches));

    let mouseActive = false;

    panel.addEventListener('mousedown', (event) => {
      const pointer = [
        (event.pageX - panelMetrics.left) / panelMetrics.width,
        1 - (event.pageY - panelMetrics.top) / panelMetrics.height
      ];

      mouseActive = true;

      for (let index = 0; index < MAX_TOUCH_POINTS - 1; index += 1) {
        const x = touchPoints[index * 2];
        const y = touchPoints[index * 2 + 1];
        if (Math.abs(pointer[0] - x) < 0.1 && Math.abs(pointer[1] - y) < 0.1) {
          mouseActive = false;
          break;
        }
      }

      if (mouseActive) {
        touchPoints.set(pointer, touchPoints.length - 2);
      }
    });

    panel.addEventListener('mousemove', (event) => {
      if (!mouseActive) {
        return;
      }
      touchPoints.set([
        (event.pageX - panelMetrics.left) / panelMetrics.width,
        1 - (event.pageY - panelMetrics.top) / panelMetrics.height
      ], touchPoints.length - 2);
    });

    panel.addEventListener('mouseup', () => {
      mouseActive = false;
      touchPoints.set([-1, -1], touchPoints.length - 2);
    });
  }

  const runSimulationPass = (sourceIndex, targetIndex, deltaMs) => {
    const source = pingPong[sourceIndex];
    const target = pingPong[targetIndex];

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, HEATMAP_RESOLUTION, HEATMAP_RESOLUTION);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(simulationProgram);
    gl.enableVertexAttribArray(simulationPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(simulationPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform2f(simulationResolution, HEATMAP_RESOLUTION, HEATMAP_RESOLUTION);
    gl.uniform1i(simulationTexture, 0);
    gl.uniform2fv(simulationTouchPoints, touchPoints);
    gl.uniform1f(simulationDeltaTime, Math.min(deltaMs / 1000, 4 / 60));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const runBlurPass = (sourceIndex, targetIndex, direction) => {
    const source = pingPong[sourceIndex];
    const target = pingPong[targetIndex];

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, HEATMAP_RESOLUTION, HEATMAP_RESOLUTION);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(blurProgram);
    gl.enableVertexAttribArray(blurPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(blurPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1fv(blurWeights, gaussianWeights);
    gl.uniform1i(blurTexture, 0);
    gl.uniform2f(blurPixelSize, 1 / HEATMAP_RESOLUTION, 1 / HEATMAP_RESOLUTION);
    gl.uniform2f(blurDirection, direction[0], direction[1]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const draw = (deltaMs) => {
    const firstTarget = (previousIndex + 1) % pingPong.length;
    runSimulationPass(previousIndex, firstTarget, deltaMs || 0);

    let currentIndex = firstTarget;

    const secondTarget = (currentIndex + 1) % pingPong.length;
    runBlurPass(currentIndex, secondTarget, [1, 0]);
    currentIndex = secondTarget;

    const finalTarget = (currentIndex + 1) % pingPong.length;
    runBlurPass(currentIndex, finalTarget, [0, 1]);
    currentIndex = finalTarget;

    previousIndex = currentIndex;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pingPong[currentIndex].texture;
  };

  return { draw };
}

function createSelectionRenderer(gl, panelMetrics, contentImage, selectionImage) {
  const contentTexture = createTextureFromImage(gl, contentImage);
  const selectionTexture = createTextureFromImage(gl, selectionImage);

  const outputTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, outputTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 2, 3]), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const contentProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, SIMPLE_TEXTURE_FRAGMENT_SHADER);
  const contentPosition = gl.getAttribLocation(contentProgram, 'aPosition');
  const contentSampler = gl.getUniformLocation(contentProgram, 'uTexture');

  const overlayProgram = createProgram(gl, SELECTION_VERTEX_SHADER, SIMPLE_TEXTURE_FRAGMENT_SHADER);
  const overlayIndex = gl.getAttribLocation(overlayProgram, 'aIndex');
  const overlayCoords = gl.getUniformLocation(overlayProgram, 'uCoords');
  const overlaySampler = gl.getUniformLocation(overlayProgram, 'uTexture');

  const selectionRects = [];

  const refreshSelection = () => {
    const selection = document.getSelection();
    selectionRects.length = 0;

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();

    for (let index = 0; index < rects.length; index += 1) {
      const rect = rects[index];
      selectionRects.push({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  document.addEventListener('selectionchange', refreshSelection);
  window.addEventListener('resize', refreshSelection);

  const render = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(contentProgram);
    gl.enableVertexAttribArray(contentPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(contentPosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.uniform1i(contentSampler, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (selectionRects.length > 0) {
      gl.useProgram(overlayProgram);
      gl.enableVertexAttribArray(overlayIndex);
      gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
      gl.vertexAttribPointer(overlayIndex, 1, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, selectionTexture);
      gl.uniform1i(overlaySampler, 0);

      selectionRects.forEach((rect) => {
        const left = -1 + (2 * (rect.left - panelMetrics.left)) / panelMetrics.width;
        const top = 1 - (2 * (rect.top - panelMetrics.top)) / panelMetrics.height;
        const right = -1 + (2 * (rect.left + rect.width - panelMetrics.left)) / panelMetrics.width;
        const bottom = 1 - (2 * (rect.top + rect.height - panelMetrics.top)) / panelMetrics.height;

        gl.uniform4f(overlayCoords, left, top, right, bottom);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const handleResize = () => {
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  return {
    render,
    handleResize,
    texture: outputTexture,
    updateTextures: async (svgFactory) => {
      const [baseImage, highlightImage] = await Promise.all([
        svgFactory.render(false),
        svgFactory.render(true)
      ]);
      updateTextureFromImage(gl, contentTexture, baseImage);
      updateTextureFromImage(gl, selectionTexture, highlightImage);
    }
  };
}

function startAnimationLoop({ gl, panelMetrics, heatmap, selectionRenderer, svgFactory, content }) {
  content.classList.add(CLASS_NAMES.isActive);

  const displayProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, FINAL_FRAGMENT_SHADER);
  const positionLocation = gl.getAttribLocation(displayProgram, 'aPosition');
  const heatmapResolutionUniform = gl.getUniformLocation(displayProgram, 'uHeatMapResolution');
  const textureUniform = gl.getUniformLocation(displayProgram, 'uTexture');
  const heatmapUniform = gl.getUniformLocation(displayProgram, 'uHeatMap');
  const amplitudeUniform = gl.getUniformLocation(displayProgram, 'uAmplitude');
  const wavelengthUniform = gl.getUniformLocation(displayProgram, 'uWavelength');
  const timeUniform = gl.getUniformLocation(displayProgram, 'uTime');

  const quadBuffer = createFullscreenQuadBuffer(gl);

  let lastFrame = performance.now();
  const startTime = lastFrame;
  let amplitudeProgress = 0;

  const renderFrame = (timestamp) => {
    const delta = timestamp - lastFrame;
    lastFrame = timestamp;

    const elapsed = (timestamp - startTime) % 1e6;
    amplitudeProgress = Math.max(Math.min(1, elapsed / 20000), amplitudeProgress);

    const heatmapTexture = heatmap.draw(delta || 0);
    selectionRenderer.render();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(displayProgram);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, selectionRenderer.texture);
    gl.uniform1i(textureUniform, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, heatmapTexture);
    gl.uniform1i(heatmapUniform, 1);

    gl.uniform2f(heatmapResolutionUniform, HEATMAP_RESOLUTION, HEATMAP_RESOLUTION);
    gl.uniform1f(amplitudeUniform, (amplitudeProgress / (gl.canvas.height / window.devicePixelRatio)) || 0);
    gl.uniform1f(
      wavelengthUniform,
      gl.canvas.width * (2 * Math.PI / (256 * window.devicePixelRatio))
    );
    gl.uniform1f(timeUniform, Math.floor(elapsed) / 10000);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(renderFrame);
  };

  const handleResize = async () => {
    resizeDrawingSurface(gl);
    const bounds = measurePanel(panelMetrics.el);
    Object.assign(panelMetrics, bounds);
    selectionRenderer.handleResize();
    try {
      await selectionRenderer.updateTextures(svgFactory);
    } catch (error) {
      console.error('Failed to rebuild textures after resize', error);
    }
  };

  window.addEventListener('resize', handleResize);
  requestAnimationFrame(renderFrame);
}

function measurePanel(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: element.offsetWidth,
    height: element.offsetHeight
  };
}
