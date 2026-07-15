"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function InfernoBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    const renderer = new Renderer({ alpha: true, depth: false, antialias: true });
    const gl = renderer.gl;
        if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragInfernoBoard,
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
      program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      );
    }

    window.addEventListener("resize", resize);
    resize();

    let raf: number;
    if (isStatic) {
      program.uniforms.uTime.value = 4.0;
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
      style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}
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

const fragInfernoBoard = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i),hash(i+vec2(1,0)),u.x),
    mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),
    u.y
  );
}

float fbm(vec2 p){
  float f=0.0, a=0.5;
  for(int i=0;i<5;i++){
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

// heat shimmer (medium burn)
vec2 heat(vec2 p){
  p.y += sin(p.x*1.8 + uTime*0.6)*0.04;
  p.y += sin(p.x*3.4 + uTime*0.35)*0.02;
  p.x += sin(p.y*2.2 + uTime*0.4)*0.02;
  return p;
}

// ember particle mask
float ember(vec2 p, float seed) {
    float n = noise(p * 4.0 + seed);
    return smoothstep(0.93, 1.0, n);
}

// rectangular slip with burning edges
float slipMask(vec2 p){
  // base rectangle
  vec2 b = abs(p);
  float rect = step(b.x, 0.45) * step(b.y, 0.25);

  // burning edges via noise erosion
  float edgeNoise = fbm(p * 6.0 + vec2(uTime*0.4, 0.0));
  float edge = smoothstep(0.2, 0.6, edgeNoise);

  return rect * edge;
}

// shield silhouette (ChainLink emblem)
float shield(vec2 p){
  p.y *= 1.15;
  float r = length(p);
  float top = smoothstep(0.45, 0.25, r);
  float bottom = smoothstep(0.75, 0.55, r);
  float cut = smoothstep(-0.1, 0.1, p.y);
  return top * (1.0 - bottom) * cut;
}

// chain link inside shield
float chain(vec2 p){
  p *= 2.2;
  float r = length(p);
  float ring = smoothstep(0.32, 0.28, abs(r - 0.3));
  return ring;
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z,1.0);
  vec2 p = (uv*2.0-1.0)*aspect;

  // heat shimmer
  vec2 hp = heat(p);

  // base inferno gradient
  float h = smoothstep(-1.0, 1.0, hp.y);
  vec3 col = mix(vec3(0.05,0.0,0.0), vec3(0.4,0.05,0.0), h);

  // flame brightness via fbm
  float flame = fbm(hp*2.5 + vec2(0.0, uTime*0.3));
  col += vec3(0.8,0.35,0.1) * flame * 0.4;

  // ember drift (3 layers)
  float t = uTime * 0.2;

  float e1 = ember(hp * 1.4 + vec2(0.0, -t), 1.3);
  float e2 = ember(hp * 2.0 + vec2(0.0, -t*1.4), 3.7);
  float e3 = ember(hp * 2.8 + vec2(0.0, -t*1.9), 5.5);

  vec3 emberCol = vec3(1.0,0.6,0.2);
  float emberMix = e1 * 0.3 + e2 * 0.2 + e3 * 0.15;
  col += emberCol * emberMix * 0.6;

  // burning slip (left-center)
  vec2 sp = hp - vec2(-0.35, 0.05);
  float slip = slipMask(sp);

  vec3 slipCol = vec3(1.0,0.8,0.5);
  col = mix(col, slipCol, slip * 0.9);

  // slip edge glow
  float edgeGlow = smoothstep(0.2, 0.6, fbm(sp*8.0 + vec2(uTime*0.6, 0.0)));
  col += vec3(1.0,0.6,0.2) * edgeGlow * slip * 0.4;

  // emblem (lower-right, heat distorted)
  vec2 ep = heat(p - vec2(0.55, -0.45));

  float s = shield(ep*1.4);
  float c = chain(ep*1.4);

  vec3 glowCol = vec3(0.0,1.0,0.7);

  col = mix(col, glowCol, s * 0.9);
  col = mix(col, vec3(0.0), c * 0.9);

  // glow pulse
  float pulse = 0.5 + 0.5 * sin(uTime * 0.4);
  col += glowCol * pulse * 0.18 * s;

  // vignette (your fix)
  vec2 vig_p = vUv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.4, length(vig_p * vec2(1.0, 1.5)));
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;
