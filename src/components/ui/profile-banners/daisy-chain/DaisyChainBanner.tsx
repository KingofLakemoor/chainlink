"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function DaisyChainBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    const renderer = new Renderer({ alpha: true, depth: false, antialias: true });
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

// --- helpers ---
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

// circle sdf
float circle(vec2 p, float r) {
  return length(p) - r;
}

// cute daisy petals
float daisyPetals(vec2 p, float petalCount, float radius, float thickness) {
  float ang = atan(p.y, p.x);
  float r = length(p);
  float k = petalCount * 0.5;
  float petalShape = cos(ang * k);
  float petal = smoothstep(radius, radius - thickness, r * (0.6 + 0.4 * petalShape));
  return petal;
}

// chain link pattern along x
float chainMask(vec2 p) {
  // p.y near 0, repeated circles along x
  float row = smoothstep(0.18, 0.0, abs(p.y));
  float spacing = 0.35;
  float id = floor((p.x + 1.2) / spacing);
  float localX = p.x - (id * spacing - 1.2);
  vec2 q = vec2(localX, p.y);
  float link = smoothstep(0.22, 0.18, abs(length(q) - 0.18));
  return link * row;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // background: soft teal/blue with noise
  float n = fbm(p * 1.5 + uTime * 0.05);
  vec3 col = mix(vec3(0.03, 0.05, 0.07), vec3(0.04, 0.09, 0.12), n);

  // subtle vignette
  float vig = smoothstep(1.2, 0.4, length(p));
  col *= vig;

  // chain
  float chain = chainMask(p * vec2(1.0, 1.4));
  vec3 chainBase = vec3(0.75, 0.78, 0.82);
  vec3 chainShadow = vec3(0.35, 0.38, 0.42);
  float chainLight = 0.6 + 0.4 * sin(uTime * 0.7 + p.x * 4.0);
  vec3 chainCol = mix(chainShadow, chainBase, chainLight);
  col = mix(col, chainCol, chain * 0.9);

  // traveling glow along chain (left to right)
  float t = fract(uTime * 0.12);
  float glowX = mix(-1.1, 1.1, t);
  float glowDist = abs(p.x - glowX);
  float glow = smoothstep(0.35, 0.0, glowDist) * smoothstep(0.18, 0.0, abs(p.y));
  vec3 glowCol = vec3(0.9, 0.95, 1.0);
  col += glowCol * glow * 0.6;

  // daisy position near last chain on right
  vec2 daisyPos = vec2(0.8, 0.0);
  vec2 dp = (p - daisyPos);

  // growth based on glow reaching right end
  float glowAtRight = smoothstep(0.25, 0.0, abs(daisyPos.x - glowX));
  float grow = smoothstep(0.0, 1.0, glowAtRight);
  float scale = mix(0.0, 0.35, grow);

  // only draw daisy when scale > small threshold
  if (scale > 0.01) {
    vec2 d = dp / scale;

    // petals
    float petals = daisyPetals(d, 8.0, 1.0, 0.35);
    // soft sway
    float sway = 0.06 * sin(uTime * 1.2 + d.y * 2.0);
    d.x += sway;

    // recompute with sway
    petals = daisyPetals(d, 8.0, 1.0, 0.35);

    // center
    float center = smoothstep(0.4, 0.0, circle(d, 0.35));

    vec3 petalCol = vec3(1.0, 1.0, 1.0);
    vec3 centerCol = vec3(1.0, 0.9, 0.25);

    // glow around daisy
    float daisyGlow = smoothstep(0.9, 0.0, length(dp));
    col += vec3(1.0, 0.95, 0.7) * daisyGlow * grow * 0.4;

    col = mix(col, petalCol, petals * 0.9);
    col = mix(col, centerCol, center);
  }

  // tiny floating particles
  float particles = step(0.995, noise(p * 8.0 + uTime * 0.8));
  col += vec3(1.0) * particles * 0.12;

  gl_FragColor = vec4(col, 1.0);
}
`;
