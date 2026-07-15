"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function FourthOfJulyBanner({
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
      fragment: fragFourthOfJulyShield,
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

    let raf: number | undefined;
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

const fragFourthOfJulyShield = `
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

// cloth wave
vec2 wave(vec2 p){
  float w = sin(p.x*4.0 + uTime*1.4)*0.03 +
            sin(p.x*7.0 + uTime*2.1)*0.015;
  p.y += w;
  return p;
}

// shield silhouette
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

  // wave distortion
  vec2 wp = wave(p);

  // base flag stripes
  float stripe = step(0.0, sin(wp.y*20.0));
  vec3 red = vec3(0.75,0.05,0.1);
  vec3 white = vec3(0.95,0.95,0.95);
  vec3 col = mix(red, white, stripe);

  // blue canton
  if(wp.x < -0.25 && wp.y > 0.0){
    col = vec3(0.05,0.1,0.45);

    float star = step(0.995, noise(wp*40.0 + uTime*0.5));
    col += vec3(1.0)*star*0.8;
  }

  // shield emblem (waving)
  vec2 ep = wave(p - vec2(0.55,0.0));

  float s = shield(ep*1.4);
  float c = chain(ep*1.4);

  vec3 shieldCol = vec3(0.0,1.0,0.7);

  col = mix(col, shieldCol, s * 0.9);
  col = mix(col, vec3(0.0), c * 0.9);

  // glow
  float glow = smoothstep(0.6,0.0,length(ep));
  col += shieldCol * glow * 0.25;

  // vignette
  vec2 vig_p = uv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.4, length(vig_p * vec2(1.0, 1.5)));
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;
