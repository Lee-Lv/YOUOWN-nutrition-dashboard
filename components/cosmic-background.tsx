"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTheme;
  uniform float uQuality;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(13.1, 7.7);
      amplitude *= 0.5;
    }
    return value;
  }

  float ribbon(vec2 p, float lane, float phase, float width) {
    float wave = 0.5
      + 0.16 * sin(p.x * 5.4 + phase)
      + 0.075 * sin(p.x * 12.0 - phase * 0.72)
      + 0.055 * sin(p.x * 23.0 + phase * 1.3);
    float distanceToRibbon = abs(p.y - wave - lane);
    float cloud = fbm(p * vec2(2.1, 4.0) + vec2(phase * 0.08, -phase * 0.04));
    return exp(-pow(distanceToRibbon / (width + cloud * 0.014), 2.0)) * (0.72 + cloud * 0.52);
  }

  float starField(vec2 p, float density, float phase) {
    vec2 grid = floor(p * density);
    vec2 local = fract(p * density) - 0.5;
    float seed = hash21(grid);
    float size = mix(0.025, 0.11, hash21(grid + 8.1));
    float twinkle = 0.55 + 0.45 * sin(uTime * mix(0.55, 1.8, seed) + phase + seed * 9.0);
    float point = 1.0 - smoothstep(0.0, size, length(local));
    float sparse = step(0.91, seed) * step(0.28, uQuality);
    return point * sparse * twinkle * mix(0.32, 0.72, seed);
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 p = (vUv - 0.5) * aspect;
    float time = uTime * 0.16;
    float breath = 0.78 + 0.22 * (0.5 + 0.5 * sin(uTime * 0.78));
    vec2 drift = vec2(sin(time * 0.42), cos(time * 0.35)) * 0.055;
    vec2 pointer = (uPointer - 0.5) * 0.035;
    vec2 q = p + drift + pointer;

    float edge = smoothstep(0.2, 0.9, length((vUv - 0.5) * vec2(1.25, 1.0)));
    float centralQuiet = smoothstep(0.06, 0.52, length((vUv - 0.5) * vec2(1.0, 0.82)));
    float ribbonA = ribbon(q * vec2(0.92, 1.0) + vec2(0.0, 0.12), -0.03, time * 3.0, 0.026);
    float ribbonB = ribbon(q * vec2(0.82, 1.0) + vec2(0.16, -0.12), 0.21, -time * 2.1, 0.019);
    float haze = fbm(q * 1.65 + vec2(time * 0.3, -time * 0.18));
    float stars = starField(vUv + drift * 0.35, mix(52.0, 70.0, uQuality), time)
      + starField(vUv - drift * 0.7 + 0.2, mix(25.0, 34.0, uQuality), -time * 0.7) * 0.7;

    vec3 base = mix(vec3(0.018, 0.055, 0.048), vec3(0.018, 0.045, 0.075), uTheme);
    vec3 primary = mix(vec3(0.18, 0.95, 0.57), vec3(0.42, 0.72, 1.0), uTheme);
    vec3 secondary = mix(vec3(0.06, 0.30, 0.95), vec3(0.10, 0.86, 0.75), uTheme);
    vec3 color = base;
    color += primary * ribbonA * (0.09 + edge * 0.27) * breath;
    color += secondary * ribbonB * (0.07 + edge * 0.23) * breath;
    color += primary * haze * edge * 0.025 * breath;
    color += vec3(0.63, 0.96, 0.88) * stars * (0.12 + edge * 0.42) * (0.82 + breath * 0.18);
    color *= 0.9 + centralQuiet * 0.1;
    color *= 0.78 + 0.22 * (1.0 - smoothstep(0.35, 0.95, length((vUv - 0.5) * 1.08)));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Keep a non-null local reference for callbacks created below.
    const activeCanvas = canvas;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = activeCanvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;
    const activeGl = gl;

    const vertexShader = compileShader(activeGl, activeGl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(activeGl, activeGl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;
    const program = activeGl.createProgram();
    if (!program) return;
    activeGl.attachShader(program, vertexShader);
    activeGl.attachShader(program, fragmentShader);
    activeGl.linkProgram(program);
    if (!activeGl.getProgramParameter(program, activeGl.LINK_STATUS)) return;
    activeGl.useProgram(program);

    const position = activeGl.createBuffer();
    if (!position) return;
    activeGl.bindBuffer(activeGl.ARRAY_BUFFER, position);
    activeGl.bufferData(activeGl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), activeGl.STATIC_DRAW);
    const location = activeGl.getAttribLocation(program, "aPosition");
    activeGl.enableVertexAttribArray(location);
    activeGl.vertexAttribPointer(location, 2, activeGl.FLOAT, false, 0, 0);

    const timeLocation = activeGl.getUniformLocation(program, "uTime");
    const resolutionLocation = activeGl.getUniformLocation(program, "uResolution");
    const pointerLocation = activeGl.getUniformLocation(program, "uPointer");
    const themeLocation = activeGl.getUniformLocation(program, "uTheme");
    const qualityLocation = activeGl.getUniformLocation(program, "uQuality");
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
    const startedAt = performance.now();
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;

    function quality() {
      return window.innerWidth < 700 ? 0.48 : window.devicePixelRatio > 1.5 ? 0.8 : 1;
    }

    function resize() {
      const scale = quality();
      width = Math.max(1, Math.floor(window.innerWidth * scale));
      height = Math.max(1, Math.floor(window.innerHeight * scale));
      if (activeCanvas.width !== width || activeCanvas.height !== height) {
        activeCanvas.width = width;
        activeCanvas.height = height;
        activeGl.viewport(0, 0, width, height);
      }
    }

    function render(now: number) {
      resize();
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;
      const theme = document.documentElement.dataset.visualTheme === "instrument" ? 1 : 0;
      activeGl.uniform1f(timeLocation, reduceMotion.matches ? 5 : (now - startedAt) / 1000);
      activeGl.uniform2f(resolutionLocation, width, height);
      activeGl.uniform2f(pointerLocation, pointer.x, pointer.y);
      activeGl.uniform1f(themeLocation, theme);
      activeGl.uniform1f(qualityLocation, quality());
      activeGl.drawArrays(activeGl.TRIANGLES, 0, 3);
      if (!reduceMotion.matches) frame = window.requestAnimationFrame(render);
      lastFrame = now;
    }

    function onPointerMove(event: PointerEvent) {
      pointer.targetX = event.clientX / window.innerWidth;
      pointer.targetY = 1 - event.clientY / window.innerHeight;
    }

    const observer = new MutationObserver(() => render(lastFrame || performance.now()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-visual-theme"] });
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    resize();
    render(performance.now());

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      activeGl.deleteBuffer(position);
      activeGl.deleteProgram(program);
      activeGl.deleteShader(vertexShader);
      activeGl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="cosmic-background" aria-hidden="true" />;
}
