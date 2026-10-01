"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function PinktoberBanner({
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
      console.error("WebGL Error", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragPinktober,
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
      program.uniforms.uTime.value = 3.2;
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
      if (container.current && container.current.contains(gl.canvas)) {
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

const fragPinktober = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// --- Noise Helpers ---
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
  for (int i = 0; i < 4; i++) {
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

// --- Pink Ribbon SDF ---
// Stylized pink ribbon loop motif centered around origin
float sdRibbonLoop(vec2 p) {
  p.x *= 1.1; // scale horizontal ratio
  // upper loop
  vec2 loopCenter = vec2(0.0, 0.18);
  float loopOuter = length(p - loopCenter) - 0.22;
  float loopInner = length(p - loopCenter) - 0.12;
  float upperRing = max(loopOuter, -loopInner);
  float upperHalf = p.y - 0.12;
  float upperLoop = max(upperRing, -upperHalf);

  // left leg
  vec2 pLeft = p - vec2(-0.11, -0.15);
  // rotate ~25 deg
  mat2 rotL = mat2(0.906, 0.422, -0.422, 0.906);
  vec2 qLeft = rotL * pLeft;
  float legL = max(abs(qLeft.x) - 0.05, abs(qLeft.y) - 0.28);

  // right leg
  vec2 pRight = p - vec2(0.11, -0.15);
  // rotate ~-25 deg
  mat2 rotR = mat2(0.906, -0.422, 0.422, 0.906);
  vec2 qRight = rotR * pRight;
  float legR = max(abs(qRight.x) - 0.05, abs(qRight.y) - 0.28);

  float legs = min(legL, legR);
  return min(upperLoop, legs);
}

// --- Chain Link Accent Mask ---
float chainLinkMask(vec2 p) {
  p.y += sin(p.x * 2.5 + uTime * 0.8) * 0.08;
  float row = smoothstep(0.16, 0.0, abs(p.y - 0.25));
  float spacing = 0.38;
  float id = floor((p.x + 1.5) / spacing);
  float localX = p.x - (id * spacing - 1.5);
  vec2 q = vec2(localX, p.y - 0.25);
  float ring = abs(length(q * vec2(1.0, 1.4)) - 0.12);
  float link = smoothstep(0.035, 0.01, ring);
  return link * row;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // --- Background: Deep Midnight Violet to Fuchsia/Magenta Gradient ---
  float bgDist = length(p * vec2(0.8, 1.2));
  vec3 bgDark = vec3(0.08, 0.02, 0.08); // Dark midnight orchid
  vec3 bgRose = vec3(0.24, 0.05, 0.20); // Deep magenta tint
  vec3 col = mix(bgRose, bgDark, bgDist);

  // Soft flowing silk waves
  vec2 waveP = p;
  waveP.y += sin(waveP.x * 2.8 + uTime * 0.9) * 0.12 + cos(waveP.x * 1.5 - uTime * 0.6) * 0.08;
  float waveNoise = fbm(waveP * 2.0 + vec2(uTime * 0.1, 0.0));

  vec3 silkHotPink = vec3(0.92, 0.20, 0.58);
  vec3 silkSoftPink = vec3(1.0, 0.55, 0.78);

  float waveMask = smoothstep(0.4, 0.8, waveNoise);
  col = mix(col, mix(silkHotPink * 0.5, silkSoftPink * 0.7, waveNoise), waveMask * 0.45);

  // --- Breast Cancer Awareness Pink Ribbon Emblem (Right Side) ---
  vec2 ribbonPos = vec2(0.65 * aspect.x, -0.05);
  vec2 rp = p - ribbonPos;

  // Gentle breathing sway
  float sway = sin(uTime * 1.2 + rp.y * 2.0) * 0.02;
  rp.x += sway;

  float dRibbon = sdRibbonLoop(rp / 0.85) * 0.85;
  float ribbonFill = smoothstep(0.01, -0.01, dRibbon);
  float ribbonGlow = smoothstep(0.25, 0.0, dRibbon);

  vec3 ribbonBase = vec3(0.98, 0.30, 0.65); // Hot Pink
  vec3 ribbonHighlight = vec3(1.0, 0.80, 0.92); // Bright Soft Rose

  // Light shine along ribbon
  float ribbonShine = 0.5 + 0.5 * sin(rp.x * 8.0 - rp.y * 12.0 + uTime * 1.5);
  vec3 ribbonCol = mix(ribbonBase, ribbonHighlight, ribbonShine * 0.6);

  // Apply Ribbon Glow & Shape
  col += vec3(0.95, 0.25, 0.60) * ribbonGlow * 0.4;
  col = mix(col, ribbonCol, ribbonFill);

  // --- ChainLink Interlocking Accent along Banner ---
  float chain = chainLinkMask(p);
  vec3 chainGold = vec3(1.0, 0.85, 0.45);
  vec3 chainPinkGlow = vec3(1.0, 0.4, 0.8);
  float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + p.x * 3.0);
  vec3 chainCol = mix(chainPinkGlow, chainGold, pulse * 0.6);
  col = mix(col, chainCol, chain * 0.85);

  // --- Floating Glowing Embers / Particles ---
  vec2 partP = p * vec2(3.0, 5.0) + vec2(0.0, -uTime * 0.3);
  float particles = step(0.988, noise(partP));
  float partGlow = smoothstep(0.95, 1.0, noise(partP * 1.5 + vec2(uTime * 0.2, 0.0)));

  vec3 emberCol = vec3(1.0, 0.6, 0.85);
  col += emberCol * (particles * 0.6 + partGlow * 0.3);

  // --- Subtle Outer Vignette ---
  float vig = smoothstep(1.5, 0.5, length((uv * 2.0 - 1.0) * vec2(1.0, 1.2)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
