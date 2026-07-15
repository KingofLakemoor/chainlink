"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function ResponsibleGamblerBaseBanner({
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
      fragment: fragResponsible,
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
      className="absolute inset-0"
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

const fragResponsible = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// noise helpers
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
  float f=0.0,a=0.5;
  for(int i=0;i<5;i++){ f+=a*noise(p); p*=2.02; a*=0.5; }
  return f;
}

// soft text mask (fake glyph fog)
float textFog(vec2 p, float seed){
  float n = fbm(p*3.0 + seed);
  return smoothstep(0.55, 0.7, n);
}

// chainlink hex emblem
float hex(vec2 p){
  p = abs(p);
  return max(p.x*0.8660254 + p.y*0.5, p.y) - 0.3;
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z,1.0);
  vec2 p = (uv*2.0-1.0)*aspect;

  // background
  float base = fbm(p*1.2 + uTime*0.02);
  vec3 col = mix(vec3(0.02,0.03,0.04), vec3(0.05,0.08,0.1), base*0.6);

  // ethereal cloud
  float cloud = fbm(p*0.8 - vec2(0.0,uTime*0.03));
  col += vec3(0.4,0.9,0.7) * cloud * 0.25;

  // PSA text fog (cycling)
  float t = floor(mod(uTime*0.25, 7.0));
  float fog = textFog(p + vec2(0.0,0.3), t*3.17);
  vec3 fogCol = vec3(0.9,1.0,0.95);
  col = mix(col, fogCol, fog * 0.35);

  // chainlink emblem on right
  vec2 ep = p - vec2(0.55,0.0);
  float h = hex(ep*1.4);
  float emblem = smoothstep(0.02,0.0,h);
  vec3 emblemCol = vec3(0.0,1.0,0.7);
  col = mix(col, emblemCol, emblem);

  // glow around emblem
  float glow = smoothstep(0.6,0.0,length(ep));
  col += emblemCol * glow * 0.25;

  // vignette using stretched unscaled UVs to prevent pinhole
  vec2 vig_p = uv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.4, length(vig_p * vec2(1.0, 1.5)));
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;
