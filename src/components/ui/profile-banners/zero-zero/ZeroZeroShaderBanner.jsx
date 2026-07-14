"use client";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";
import React, { useRef, useEffect } from "react";

export function ZeroZeroShaderBanner({ isStatic = false, ...props }) {
  const container = useRef(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    const renderer = new Renderer({ alpha: true, depth: false });
    const gl = renderer.gl;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
        },
      },
      transparent: true,
    });

    function resize() { if (!container.current) return;
      renderer.setSize(container.current.offsetWidth, container.current.offsetHeight);
      if (program.uniforms.uResolution) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height
        );
      }
    }

    window.addEventListener("resize", resize);
    resize();

    const mesh = new Mesh(gl, { geometry, program });
    let raf;

    if (isStatic) {
      program.uniforms.uTime.value = 2.5;
      renderer.render({ scene: mesh });
    } else {
      const update = (t) => {
        raf = requestAnimationFrame(update);
        program.uniforms.uTime.value = t * 0.001;
        if (mounted) renderer.render({ scene: mesh });
      };
      raf = requestAnimationFrame(update);
    }

    container.current.appendChild(gl.canvas);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (container.current && container.current.contains(gl.canvas)) { if (container.current && container.current.contains(gl.canvas)) { container.current.removeChild(gl.canvas); } }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      ref={container}
      className="absolute inset-0 w-full h-full"
      style={{ borderRadius: "8px", overflow: "hidden" }}
      {...props}
    />
  );
}

const vert = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const frag = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// ----------------------
// Noise helpers
// ----------------------
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

// ----------------------
// LED Digit Mask
// ----------------------
float segment(vec2 uv, vec2 a, vec2 b, float width) {
  vec2 pa = uv - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return smoothstep(width, 0.0, length(pa - ba * h));
}

float digit(vec2 uv, int num) {
  float s = 0.0;

  // Segment positions
  vec2 A = vec2(0.0, 0.9);
  vec2 B = vec2(0.8, 0.45);
  vec2 C = vec2(0.8, -0.45);
  vec2 D = vec2(0.0, -0.9);
  vec2 E = vec2(-0.8, -0.45);
  vec2 F = vec2(-0.8, 0.45);
  vec2 G = vec2(0.0, 0.0);

  float w = 0.12;

  bool segA = (num != 1 && num != 4);
  bool segB = (num != 5 && num != 6);
  bool segC = (num != 2);
  bool segD = (num != 1 && num != 4 && num != 7);
  bool segE = (num == 0 || num == 2 || num == 6 || num == 8);
  bool segF = (num != 1 && num != 2 && num != 3 && num != 7);
  bool segG = (num != 0 && num != 1 && num != 7);

  if (segA) s += segment(uv, F, B, w);
  if (segB) s += segment(uv, B, C, w);
  if (segC) s += segment(uv, C, E, w);
  if (segD) s += segment(uv, E, F, w);
  if (segE) s += segment(uv, E, D, w);
  if (segF) s += segment(uv, F, A, w);
  if (segG) s += segment(uv, A, D, w);

  return clamp(s, 0.0, 1.0);
}

// ----------------------
// Main
// ----------------------
void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);

  // Arena blackout
  vec3 col = vec3(0.0);
  col += vec3(0.02, 0.0, 0.0) * fbm(uv * 3.0 + uTime * 0.02);

  // Shockwave pulse
  float r = length(uv);
  float pulse = smoothstep(0.4, 0.0, abs(r - (0.3 + 0.1 * sin(uTime * 0.5))));
  col += vec3(0.4, 0.0, 0.0) * pulse * 0.4;

  // LED digits "0:00"
  vec2 duv = uv * 1.4;
  duv.x -= 0.6;

  float d0 = digit(duv, 0);
  float colon = smoothstep(0.03, 0.0, length(duv - vec2(0.0, 0.3))) +
                smoothstep(0.03, 0.0, length(duv - vec2(0.0, -0.3)));

  float d1 = digit(duv + vec2(0.6, 0.0), 0);
  float d2 = digit(duv + vec2(1.2, 0.0), 0);

  float digits = d0 + colon + d1 + d2;

  // Flicker
  float flicker = 0.8 + 0.2 * sin(uTime * 40.0 + uv.y * 10.0);

  // Glitch
  float glitch = step(0.97, noise(vec2(uTime * 2.0, uv.y * 20.0)));

  vec3 ledColor = vec3(1.0, 0.1, 0.1);
  col += ledColor * digits * flicker;
  col += ledColor * digits * glitch * 0.4;

  // Dust
  col += vec3(0.1) * fbm(uv * 8.0 + uTime * 0.1) * 0.1;

  // Vignette
  float vig = smoothstep(1.2, 0.4, length(vUv * 2.0 - 1.0));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
