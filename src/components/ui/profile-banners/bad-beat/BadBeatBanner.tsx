"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function BadBeatBanner({
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
      fragment: fragBadBeat,
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
          Math.max(1.0, Math.min(gl.canvas.width / gl.canvas.height, 3.0)) // clamp aspect ratio to fix pinhole
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
      className={`absolute inset-0 w-full h-full ${props.className || ''}`}
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

const fragBadBeat = `
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
  vec2 u = f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
    mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for(int i=0;i<5;i++){
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z, 1.0);
  vec2 p = (uv*2.0-1.0)*aspect;

  // base dark
  float n = fbm(p*1.4 + uTime*0.03);
  vec3 col = mix(vec3(0.02,0.01,0.02), vec3(0.05,0.02,0.03), n*0.6);

  // grid
  vec2 g = p*vec2(2.4,2.0);
  float gx = smoothstep(0.02,0.0,abs(fract(g.x+0.5)-0.5));
  float gy = smoothstep(0.02,0.0,abs(fract(g.y+0.5)-0.5));
  float grid = (gx+gy)*0.5;
  col += vec3(0.15,0.05,0.05)*grid*0.25;

  // collapse wave radius
  float r = length(p);
  float wave = abs(r - (0.2 + uTime*0.4));
  float ring = smoothstep(0.04,0.0,wave);

  // shock color
  vec3 shock = vec3(1.0,0.1,0.1);

  // distort grid behind wave
  float distort = smoothstep(0.15,0.0,wave);
  col += shock * ring * 0.8;

  // glitch tear
  float tear = step(0.97, noise(vec2(uTime*2.0, p.y*20.0)));
  col += vec3(1.0,0.2,0.2)*tear*0.2;

  // heartbeat spike before collapse
  float hb = sin(uTime*3.0 + r*12.0);
  float spike = smoothstep(0.98,1.0,hb);
  col += vec3(1.0,0.3,0.3)*spike*0.3;

  // vignette
  float vig = smoothstep(1.2,0.4,r);
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;
