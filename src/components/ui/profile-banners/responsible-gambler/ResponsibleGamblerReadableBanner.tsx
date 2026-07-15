"use client";

import React, { useEffect, useRef, useState } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

const PSA_LINES = [
  "Chances are you’re about to lose.",
  "Think. Is this a bet you really want to place?",
  "What’s gambling really costing you?",
  "What are you prepared to lose today?",
  "Imagine what you could be buying instead.",
  "You win some. You lose more.",
  "What are you really gambling with?"
];

export function ResponsibleGamblerReadableBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {

  const container = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  // Cycle readable PSA text
  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % PSA_LINES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Shader setup
  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    const renderer = new Renderer({ alpha: true, depth: false, antialias: true });
    const gl = renderer.gl;
        if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragResponsibleReadable,
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
      const rect = container.current.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
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
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ width: "100%", height: "100%" }} {...props}>
      <div ref={container} className="absolute inset-0" />

      {/* Readable PSA text overlay */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-[55%] pointer-events-none">
        <div
          key={index}
          className="text-emerald-100 text-[26px] font-light leading-snug opacity-0 animate-psa-fade"
        >
          {PSA_LINES[index]}
        </div>
      </div>
    </div>
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

const fragResponsibleReadable = `
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
  float f=0.0,a=0.5;
  for(int i=0;i<5;i++){ f+=a*noise(p); p*=2.02; a*=0.5; }
  return f;
}

float hex(vec2 p){
  p = abs(p);
  return max(p.x*0.8660254 + p.y*0.5, p.y) - 0.3;
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z,1.0);
  vec2 p = (uv*2.0-1.0)*aspect;

  float base = fbm(p*1.2 + uTime*0.02);
  vec3 col = mix(vec3(0.02,0.03,0.04), vec3(0.05,0.08,0.1), base*0.6);

  float cloud = fbm(p*0.8 - vec2(0.0,uTime*0.03));
  col += vec3(0.4,0.9,0.7) * cloud * 0.25;

  vec2 ep = p - vec2(0.55 * aspect.x, 0.0);
  float h = hex(ep*1.4);
  float emblem = smoothstep(0.02,0.0,h);
  vec3 emblemCol = vec3(0.0,1.0,0.7);
  col = mix(col, emblemCol, emblem);

  float glow = smoothstep(0.6,0.0,length(ep));
  col += emblemCol * glow * 0.25;

  vec2 vig_p = uv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.4, length(vig_p * vec2(1.0, 1.5)));
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;
