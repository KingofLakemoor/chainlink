"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function GenesisSyndicate({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    let renderer, gl;
        try {
          renderer = new Renderer({ alpha: true, depth: false, antialias: true });
    gl = renderer.gl;
        } catch(e) { console.error("WebGL Error", e); return; }
        if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragGenesis,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, Math.max(1.0, Math.min(3.0, gl.canvas.width / gl.canvas.height))),
        },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container.current) return;
      renderer.setSize(container.current.offsetWidth, container.current.offsetHeight);
      if (program.uniforms.uResolution) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          Math.max(1.0, Math.min(3.0, gl.canvas.width / gl.canvas.height))
        );
      }
    }

    window.addEventListener("resize", resize);
    resize();

    let raf: number;
    if (isStatic) {
      program.uniforms.uTime.value = 2.5;
      renderer.render({ scene: mesh });
    } else {
      const update = (t: number) => {
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
      if (container.current?.contains(gl.canvas)) {
        container.current.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      ref={container}
      className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
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

const fragGenesis = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// hash / noise / fbm
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

// hex / chain-ish mask
float hex(vec2 p, float s) {
  p /= s;
  p.y /= 0.8660254;
  p.x -= p.y * 0.5;
  vec2 i = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(0.0);
      vec2 h = i + g + o;
      vec2 r = p - h;
      float d = max(abs(r.x) * 1.5 + r.y * 0.8660254, abs(r.y) * 1.7320508);
      md = min(md, d);
    }
  }
  return smoothstep(0.12, 0.1, md);
}

// soft shield-ish shape
float shield(vec2 p) {
  p.y *= 1.2;
  float r = length(p);
  float top = smoothstep(0.4, 0.2, r);
  float bottom = smoothstep(0.6, 0.4, r);
  float cut = smoothstep(-0.1, 0.1, p.y);
  return top * (1.0 - bottom) * cut;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // base gradient: black -> emerald
  float grad = smoothstep(-1.0, 1.0, p.x);
  vec3 baseA = vec3(0.0, 0.0, 0.0);
  vec3 baseB = vec3(0.0, 0.18, 0.12);
  vec3 col = mix(baseA, baseB, grad);

  // subtle fbm distortion / haze
  float n = fbm(p * 1.4 + uTime * 0.03);
  col += vec3(0.0, 0.12, 0.08) * n * 0.4;

  // diagonal data grid
  vec2 g = p * vec2(2.4, 2.4);
  float gx = smoothstep(0.02, 0.0, abs(fract(g.x + 0.5) - 0.5));
  float gy = smoothstep(0.02, 0.0, abs(fract(g.y + 0.5) - 0.5));
  float grid = (gx + gy) * 0.5;
  col += vec3(0.0, 0.35, 0.22) * grid * 0.25;

  // chain-link / hex silhouette band
  vec2 hp = p * vec2(1.6, 2.0);
  hp.y += 0.1;
  float band = smoothstep(0.45, 0.2, abs(hp.y));
  float h = hex(hp, 0.35) * band;
  col = mix(col, vec3(0.02, 0.25, 0.18), h * 0.7);

  // traveling pulse along band
  float t = fract(uTime * 0.12);
  float pulseX = mix(-1.2, 1.2, t);
  float pulseDist = abs(p.x - pulseX);
  float pulse = smoothstep(0.35, 0.0, pulseDist) * band;
  vec3 pulseCol = vec3(0.0, 0.9, 0.6);
  col += pulseCol * pulse * 0.6;

  // central shield emblem
  vec2 sp = p * vec2(1.0, 1.4);
  float s = shield(sp);
  float shieldPulse = 0.6 + 0.4 * sin(uTime * 1.1);
  vec3 shieldCol = vec3(0.9, 1.0, 0.95) * shieldPulse;
  col = mix(col, shieldCol, s);

  // shield outline
  float outline = shield(sp * 1.05) - s;
  col = mix(col, vec3(0.0, 1.0, 0.7), outline * 0.9);

  // vertical scanline reveal
  float scanY = fract(uTime * 0.12);
  float scanBand = smoothstep(0.04, 0.0, abs(uv.y - scanY));
  col += vec3(0.0, 0.8, 0.5) * scanBand * 0.4;

  // tiny particles
  float particles = step(0.995, noise(p * 8.0 + uTime * 0.9));
  col += vec3(0.8, 1.0, 0.9) * particles * 0.15;

  // vignette
  float vig = smoothstep(1.2, 0.4, length(uv * 2.0 - 1.0));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
