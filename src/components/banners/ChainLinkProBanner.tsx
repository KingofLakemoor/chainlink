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

const fragChainLinkPro = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// Hash and noise utilities
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
    float t = uTime * 0.45;

    // Deep royal nebula gradient base
    vec3 deepBg = vec3(0.03, 0.02, 0.07);
    vec3 midViolet = vec3(0.12, 0.04, 0.22);
    vec3 col = mix(deepBg, midViolet, vUv.y * 0.8 + 0.2 * sin(uv.x * 1.5 + t));

    // Dynamic sweeping auroral energy wave
    float wave1 = sin(uv.x * 2.2 + t * 1.5 + sin(uv.y * 3.0 + t)) * 0.25;
    float waveDist = abs(uv.y - wave1);
    float waveGlow = smoothstep(0.45, 0.0, waveDist);
    vec3 neonPurple = vec3(0.72, 0.25, 0.98);
    vec3 neonIndigo = vec3(0.38, 0.45, 1.0);
    col += mix(neonPurple, neonIndigo, sin(uv.x + t) * 0.5 + 0.5) * waveGlow * 0.75;

    // Second ethereal light beam
    float wave2 = cos(uv.x * 1.8 - t * 1.1) * 0.3;
    float waveDist2 = abs(uv.y - wave2);
    float waveGlow2 = smoothstep(0.35, 0.0, waveDist2);
    col += vec3(0.85, 0.4, 1.0) * waveGlow2 * 0.4;

    // Grid matrix floor
    if (uv.y < 0.2) {
        float depth = 1.0 / max(0.01, (0.25 - uv.y) * 2.5);
        vec2 gridUv = vec2(uv.x * depth * 0.5, depth - t * 2.0);
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
        float line = 1.0 - min(min(grid.x, grid.y), 1.0);
        col += vec3(0.55, 0.25, 0.95) * line * smoothstep(0.2, -0.8, uv.y) * 0.35;
    }

    // Floating VIP diamond particle beacons
    vec2 pGrid = vec2(uv.x * 5.0, uv.y * 4.0);
    vec2 pId = floor(pGrid);
    vec2 pFract = fract(pGrid) - 0.5;
    float sparkHash = hash(pId + floor(t * 0.5));
    if (sparkHash > 0.82) {
        float sparkDist = length(pFract);
        float spark = smoothstep(0.12, 0.0, sparkDist);
        col += vec3(0.95, 0.85, 1.0) * spark * (0.6 + 0.4 * sin(t * 5.0 + sparkHash * 6.28));
    }

    // Subtle vignette
    float vig = smoothstep(1.7, 0.4, length(uv * vec2(0.8, 1.2)));
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
`;

export function ChainLinkProBanner({
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
      console.error("WebGL Error in ChainLinkProBanner", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl as any);
    const program = new Program(gl as any, {
      vertex: vert,
      fragment: fragChainLinkPro,
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
      program.uniforms.uTime.value = 4.2;
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
      {/* Visual Overlay: High-tech badge & PRO Member signature accent */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-950/70 border border-purple-500/40 backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.3)]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.201a4 4 0 0 1-3.86 2.929H8.713a4 4 0 0 1-3.86-2.929L2.019 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
            <path d="M5 21h14" />
          </svg>
          <span className="text-xs font-black tracking-widest uppercase font-display text-purple-200">
            CHAINLINK PRO
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono text-purple-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          VIP TIER
        </div>
      </div>
    </div>
  );
}
