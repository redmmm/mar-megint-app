'use client';

import { useEffect, useRef } from 'react';
import './CRTWarp.css';

const ROOT = 'crt-warp-container';
const CANVAS = 'crt-warp-canvas';
const MASKS = { none: 0, aperture: 1, shadow: 2, slot: 3 };

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Generates a subtle phosphor afterglow line at the bottom of the screen
// held statically in place without distracting downward movement.
const CONTENT = `#version 300 es
precision highp float;
uniform vec2 uGrid;
uniform float uTime;
uniform float uDecay;
uniform sampler2D uPrevious;
out vec4 outColor;

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uGrid;
  // Static CRT phosphor line held in place at the bottom of the screen
  float dist = uv.y;
  float beamExcite = exp(-dist * 14.0) * 0.35;
  float previous = texelFetch(uPrevious, ivec2(cell), 0).r;
  float afterglow = max(beamExcite, previous * uDecay - 0.002);
  outColor = vec4(afterglow, 0.0, 0.0, 1.0);
}`;

const DISPLAY = `#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform float uLines;
uniform float uScanline;
uniform int uMaskType;
uniform float uMask;
uniform float uBloom;
uniform float uNoise;
uniform float uFlicker;
uniform float uInterference;
uniform float uVignette;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 maskAt(vec2 px) {
  if (uMaskType == 0 || uMask <= 0.0) return vec3(1.0);
  float size = max(1.0, floor(uPixel + 0.5));
  vec2 q = floor(px / size);
  float low = 1.0 - uMask;
  vec3 m = vec3(low);
  float column = q.x;
  if (uMaskType == 2) column += mod(floor(q.y / 2.0), 2.0) * 1.5;
  int stripe = int(mod(floor(column), 3.0));
  if (stripe == 0) m.r = 1.0;
  else if (stripe == 1) m.g = 1.0;
  else m.b = 1.0;
  if (uMaskType == 2 && mod(q.y, 2.0) > 0.5) m *= mix(1.0, 0.72, uMask);
  if (uMaskType == 3) {
    float slot = mod(q.y + mod(floor(q.x / 3.0), 2.0) * 2.0, 4.0);
    if (slot < 1.0) m *= mix(1.0, 0.45, uMask);
  }
  return m;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // 1. Scanlines
  float wave = 0.5 + 0.5 * cos(uv.y * uLines * 6.2831853);
  float scanlineDarkness = uScanline * (1.0 - wave);

  // 2. Phosphor mask
  vec3 mask = maskAt(gl_FragCoord.xy);
  float maskDarkness = (1.0 - (mask.r + mask.g + mask.b) / 3.0);

  // 3. Temporal phosphor afterglow & bloom from persistence pass
  float afterglow = texture(uContent, uv).r * uBloom * 0.12;

  // 4. Subtle flicker and film/tube grain (static, non-rolling)
  float flick = uFlicker * 0.04 * (hash(vec2(floor(uTime * 60.0), 7.3)) - 0.5);
  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 173.0) - 0.5) * uNoise * 0.25;

  // 5. Edge vignette
  vec2 v = uv - 0.5;
  float vig = uVignette * clamp(dot(v, v) * 1.6, 0.0, 1.0);

  // Combine darkening effects (scanlines + vignette) and subtle phosphor light (afterglow + grain + flicker)
  float darkness = clamp(scanlineDarkness * 0.45 + maskDarkness * 0.35 + vig, 0.0, 0.75);
  float glowLift = clamp(afterglow + max(0.0, grain + flick), 0.0, 0.25);

  // Premultiplied alpha output: darkens scanline gaps while adding neutral phosphor sheen
  vec3 tint = mask * glowLift;
  float alpha = clamp(darkness + glowLift, 0.0, 0.85);
  outColor = vec4(tint, alpha);
}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, fragment, names) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const shader = compile(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vertex || !shader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, shader);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  names.forEach(name => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });
  return { program, uniforms };
};

const createTarget = (gl, width, height) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height };
};

const deleteTarget = (gl, target) => {
  if (!target) return;
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
};

export default function CRTWarp({
  persistence = 0.65,
  scanlineStrength = 0.55,
  scanlineFrequency = 260,
  mask = 'aperture',
  maskStrength = 0.28,
  bloom = 1.2,
  noise = 0.08,
  flicker = 0.12,
  interference = 0.15,
  vignette = 0.25,
  dpr = 1.5,
  fps = 60,
  paused = false,
  className = '',
  style
}) {
  const containerRef = useRef(null);

  const settings = {
    persistence: clamp(persistence, 0, 0.98),
    scanline: clamp(scanlineStrength, 0, 1),
    lines: clamp(scanlineFrequency, 60, 1200),
    mask: MASKS[mask] ?? 1,
    maskStrength: clamp(maskStrength, 0, 1),
    bloom: Math.max(0, bloom),
    noise: Math.max(0, noise),
    flicker: Math.max(0, flicker),
    interference: Math.max(0, interference),
    vignette: clamp(vignette, 0, 1),
    dpr: Math.max(0.5, dpr),
    fps: Math.max(1, fps),
    paused
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const canvas = document.createElement('canvas');
    canvas.className = CANVAS;
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power'
    });
    if (!gl) {
      canvas.remove();
      return undefined;
    }

    const content = createProgram(gl, CONTENT, ['uGrid', 'uTime', 'uDecay', 'uPrevious']);
    const display = createProgram(gl, DISPLAY, [
      'uContent',
      'uResolution',
      'uPixel',
      'uTime',
      'uLines',
      'uScanline',
      'uMaskType',
      'uMask',
      'uBloom',
      'uNoise',
      'uFlicker',
      'uInterference',
      'uVignette'
    ]);

    if (!content || !display) {
      canvas.remove();
      return undefined;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const state = {
      width: 1,
      height: 1,
      pixel: 1,
      cells: [createTarget(gl, 64, 64), createTarget(gl, 64, 64)],
      flip: 0,
      clock: 0,
      last: 0,
      raf: 0
    };

    const resize = () => {
      const s = settingsRef.current;
      const ratio = Math.min(window.devicePixelRatio || 1, s.dpr);
      const width = Math.max(1, Math.round(container.clientWidth * ratio));
      const height = Math.max(1, Math.round(container.clientHeight * ratio));
      state.pixel = ratio;
      if (width === state.width && height === state.height) return;
      state.width = width;
      state.height = height;
      canvas.width = width;
      canvas.height = height;
    };

    const draw = (target, width, height) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const bindTexture = (unit, texture, location) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(location, unit);
    };

    const render = dt => {
      const s = settingsRef.current;
      const previous = state.cells[state.flip];
      const next = state.cells[1 - state.flip];

      gl.useProgram(content.program);
      gl.uniform2f(content.uniforms.uGrid, 64, 64);
      gl.uniform1f(content.uniforms.uTime, state.clock);
      gl.uniform1f(content.uniforms.uDecay, s.persistence ** (dt * 60));
      bindTexture(0, previous.texture, content.uniforms.uPrevious);
      draw(next, 64, 64);
      state.flip = 1 - state.flip;

      gl.useProgram(display.program);
      const u = display.uniforms;
      bindTexture(0, next.texture, u.uContent);
      gl.uniform2f(u.uResolution, state.width, state.height);
      gl.uniform1f(u.uPixel, state.pixel);
      gl.uniform1f(u.uTime, state.clock);
      gl.uniform1f(u.uLines, s.lines);
      gl.uniform1f(u.uScanline, s.scanline);
      gl.uniform1i(u.uMaskType, s.mask);
      gl.uniform1f(u.uMask, s.maskStrength);
      gl.uniform1f(u.uBloom, s.bloom);
      gl.uniform1f(u.uNoise, s.noise);
      gl.uniform1f(u.uFlicker, s.flicker);
      gl.uniform1f(u.uInterference, s.interference);
      gl.uniform1f(u.uVignette, s.vignette);
      draw(null, state.width, state.height);
    };

    const tick = now => {
      state.raf = requestAnimationFrame(tick);
      if (document.hidden) {
        state.last = now;
        return;
      }
      const s = settingsRef.current;
      if (s.paused) return;
      const interval = 1000 / s.fps;
      if (state.last && now - state.last < interval - 1) return;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.1) : 1 / 60;
      state.last = now;
      state.clock += dt;
      resize();
      render(dt);
    };

    const sizes = new ResizeObserver(resize);
    sizes.observe(container);
    resize();
    state.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(state.raf);
      sizes.disconnect();
      state.cells.forEach(target => deleteTarget(gl, target));
      [content, display].forEach(item => gl.deleteProgram(item.program));
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, []);

  return <div ref={containerRef} className={[ROOT, className].filter(Boolean).join(' ')} style={style} />;
}
