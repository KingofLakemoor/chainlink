"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function EdgeLedgerBanner({
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
      fragment: fragEdgeLedger,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.height ? Math.max(1.0, Math.min(gl.canvas.width / gl.canvas.height, 3.0)) : 1.0),
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
          gl.canvas.height ? Math.max(1.0, Math.min(gl.canvas.width / gl.canvas.height, 3.0)) : 1.0
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

const fragEdgeLedger = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

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

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z, 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // base: graphite with subtle depth
  float baseN = fbm(p * 1.6 + uTime * 0.02);
  vec3 col = mix(vec3(0.03, 0.03, 0.04), vec3(0.06, 0.06, 0.08), baseN * 0.7);

  // vertical ledger columns
  vec2 lp = p * vec2(2.2, 1.0);
  float vLines = smoothstep(0.015, 0.0, abs(fract(lp.x + 0.5) - 0.5));
  vec3 ledgerCol = vec3(0.35, 0.35, 0.4);
  col += ledgerCol * vLines * 0.4;

  // horizontal entry lines scrolling upward
  vec2 hp = p * vec2(1.0, 3.0);
  hp.y += uTime * 0.25;
  float hLines = smoothstep(0.015, 0.0, abs(fract(hp.y + 0.5) - 0.5));
  vec3 entryCol = vec3(0.5, 0.5, 0.55);
  col += entryCol * hLines * 0.35;

  // highlight rows (big edges)
  float rowId = floor((hp.y + 1.0) * 4.0);
  float rowNoise = hash(vec2(rowId, 3.17));
  float highlight = step(0.8, rowNoise) * hLines;
  vec3 highlightCol = vec3(0.9, 0.8, 0.55);
  col += highlightCol * highlight * 0.6;

  // subtle diagonal light sweep
  float sweep = (p.x + p.y) * 0.7 + uTime * 0.2;
  float sweepMask = smoothstep(0.2, 0.0, abs(fract(sweep) - 0.5));
  vec3 sweepCol = vec3(0.8, 0.7, 0.5);
  col += sweepCol * sweepMask * 0.25;

  // micro ChainLink green accents on some entries
  float accent = step(0.96, noise(vec2(rowId * 0.7, hp.x * 4.0)));
  col += vec3(0.0, 0.9, 0.6) * accent * 0.25 * hLines;

  gl_FragColor = vec4(col, 1.0);
}
`;
