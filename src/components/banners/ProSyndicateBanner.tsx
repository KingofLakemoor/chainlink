"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

const vert = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}
`;

const fragSyndicate = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// Hash and 2D Noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(17.31, 89.71))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);
    float t = uTime * 0.4;

    // Dark obsidian / scorched titanium background
    vec3 deepBlack = vec3(0.04, 0.03, 0.05);
    vec3 smokedGold = vec3(0.18, 0.12, 0.04);
    vec3 col = mix(deepBlack, smokedGold, vUv.y * 0.7 + 0.3 * sin(uv.x * 1.2 + t));

    // Heavy gold molten flow wave
    float angle = atan(uv.y, uv.x);
    float dist = length(uv);
    float goldStream = sin(uv.x * 2.5 - t * 1.8 + sin(uv.y * 2.8 + t * 0.8)) * 0.35;
    float streamGlow = smoothstep(0.4, 0.0, abs(uv.y - goldStream));

    vec3 brightGold = vec3(1.0, 0.82, 0.28);
    vec3 warmAmber = vec3(0.85, 0.52, 0.15);
    vec3 purpleCore = vec3(0.55, 0.18, 0.85);

    col += mix(warmAmber, brightGold, sin(uv.x * 2.0 + t) * 0.5 + 0.5) * streamGlow * 0.85;

    // Secondary interlocked chain link highlight line
    float chainWave = sin(uv.x * 3.5 + t * 1.2) * 0.2;
    float chainGlow = smoothstep(0.2, 0.0, abs(uv.y + 0.25 - chainWave));
    col += purpleCore * chainGlow * 0.5;

    // Diagonal carbon-fiber weave / brushed bullion texture
    float stripe = sin((uv.x + uv.y) * 45.0 + t * 0.5);
    col += vec3(0.08, 0.06, 0.02) * smoothstep(0.3, 0.9, stripe);

    // Drifting gold flecks / embers
    vec2 emberUv = uv * 3.5;
    emberUv.y -= t * 1.8;
    vec2 eId = floor(emberUv);
    vec2 eFract = fract(emberUv) - 0.5;
    float eHash = hash(eId);
    if (eHash > 0.85) {
        float eDist = length(eFract);
        float ember = smoothstep(0.15, 0.0, eDist);
        col += brightGold * ember * (0.7 + 0.3 * sin(t * 6.0 + eHash * 6.28));
    }

    // Vignette
    float vig = smoothstep(1.7, 0.45, length(uv * vec2(0.85, 1.15)));
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
`;

export function ProSyndicateBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    let renderer: Renderer, gl: WebGLRenderingContext;
    try {
      renderer = new Renderer({ alpha: true, depth: false, antialias: true });
      gl = renderer.gl;
    } catch (e) {
      console.error("WebGL Error in ProSyndicateBanner", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl as any);
    const program = new Program(gl as any, {
      vertex: vert,
      fragment: fragSyndicate,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            gl.canvas.width || 600,
            gl.canvas.height || 200,
            (gl.canvas.width || 600) / Math.max(1, gl.canvas.height || 200)
          ),
        },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl as any, { geometry, program });

    function resize() {
      if (!container.current) return;
      const w = container.current.offsetWidth;
      const h = container.current.offsetHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      if (program.uniforms.uResolution) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / Math.max(1, gl.canvas.height)
        );
      }
    }

    window.addEventListener("resize", resize);
    resize();

    let animId: number;
    if (isStatic) {
      program.uniforms.uTime.value = 5.6;
      renderer.render({ scene: mesh });
    } else {
      let startTime = performance.now();
      const update = () => {
        if (!mounted) return;
        animId = requestAnimationFrame(update);
        const elapsed = (performance.now() - startTime) * 0.001;
        program.uniforms.uTime.value = elapsed;
        renderer.render({ scene: mesh });
      };
      animId = requestAnimationFrame(update);
    }

    const canvas = gl.canvas as HTMLCanvasElement;
    container.current.appendChild(canvas);

    return () => {
      mounted = false;
      window.removeEventListener("resize", resize);
      if (animId) cancelAnimationFrame(animId);
      if (container.current && canvas.parentNode === container.current) {
        container.current.removeChild(canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      ref={container}
      className={`relative w-full h-full overflow-hidden select-none bg-zinc-950 ${props.className || ""}`}
      style={props.style}
    >
      {/* Visual Overlay: Syndicate crest badge */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950/75 border border-amber-500/50 backdrop-blur-md shadow-[0_0_14px_rgba(245,158,11,0.35)]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="text-xs font-black tracking-widest uppercase font-display text-amber-300">
            PRO SYNDICATE
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-[10px] font-mono text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          300 LINKS
        </div>
      </div>
    </div>
  );
}
