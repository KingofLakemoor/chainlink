"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function BoardRoomBanner({
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
      fragment: frag,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
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
          gl.canvas.width / gl.canvas.height
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
        if (container.current && container.current.contains(gl.canvas)) { container.current.removeChild(gl.canvas); }
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      ref={container}
      className="absolute inset-0 w-full h-full"
      style={{ borderRadius: 8, overflow: "hidden" }}
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

// soft rect mask
float rectMask(vec2 p, vec2 size, float r) {
  vec2 d = abs(p) - size;
  float outside = length(max(d, 0.0));
  float inside = min(max(d.x, d.y), 0.0);
  return smoothstep(r, 0.0, outside + inside);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // base: dark board room
  float baseN = fbm(p * 1.5 + uTime * 0.03);
  vec3 col = mix(vec3(0.02, 0.03, 0.05), vec3(0.03, 0.05, 0.08), baseN * 0.7);

  // overhead haze
  float haze = fbm(p * vec2(1.0, 0.6) + vec2(0.0, uTime * 0.02));
  col += vec3(0.08, 0.09, 0.11) * haze * 0.35;

  // central "table" glow
  vec2 tableP = p * vec2(1.2, 2.0) + vec2(0.0, 0.6);
  float table = rectMask(tableP, vec2(0.9, 0.12), 0.08);
  float tablePulse = 0.6 + 0.4 * sin(uTime * 0.8);
  vec3 tableCol = vec3(0.0, 0.9, 0.6) * tablePulse;
  col = mix(col, tableCol, table * 0.9);

  // vertical odds boards (left & right)
  for (int i = 0; i < 2; i++) {
    float side = (i == 0) ? -1.0 : 1.0;
    vec2 bp = p;
    bp.x -= side * 0.9;
    bp.y *= 1.4;
    float panel = rectMask(bp, vec2(0.32, 0.7), 0.06);
    vec3 panelBase = vec3(0.02, 0.08, 0.08);
    col = mix(col, panelBase, panel);

    // grid lines
    float vLines = step(0.96, fract(bp.x * 12.0));
    float hLines = step(0.96, fract((bp.y + 0.7) * 10.0));
    float grid = (vLines + hLines) * panel;
    vec3 gridCol = vec3(0.0, 0.9, 0.6);
    col += gridCol * grid * 0.35;

    // flickering cells
    vec2 cellId = floor((bp + vec2(0.32, 0.7)) * vec2(6.0, 8.0));
    float cellNoise = hash(cellId + floor(uTime * 0.7));
    float cell = step(0.7, cellNoise) * panel;
    col += vec3(0.0, 1.0, 0.7) * cell * 0.4;
  }

  // subtle "data lines" across center
  float lineY = fract((p.y + 0.4) * 12.0);
  float midLines = smoothstep(0.02, 0.0, min(lineY, 1.0 - lineY));
  col += vec3(0.0, 0.7, 0.5) * midLines * 0.15;

  // floating particles
  float particles = step(0.995, noise(p * 8.0 + uTime * 0.9));
  col += vec3(0.8, 1.0, 0.9) * particles * 0.15;

  // vignette
  float vig = smoothstep(1.2, 0.4, length(uv * 2.0 - 1.0));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
