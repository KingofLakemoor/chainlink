import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

const fragHaboobSimple = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

float noise(vec2 p){
  return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
}

float smoothNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = noise(i);
  float b = noise(i + vec2(1.0, 0.0));
  float c = noise(i + vec2(0.0, 1.0));
  float d = noise(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// dust wall
float dust(vec2 p){
  float base = smoothstep(0.25, -0.4, p.y);
  float roll = smoothNoise(p * 2.0 + vec2(uTime * 0.15, 0.0));
  return base * (0.7 + roll * 0.3);
}

// simple town silhouette
float town(vec2 p){
  p.y += 0.6;

  float b1 = step(abs(p.x + 0.3), 0.15) * step(abs(p.y), 0.1);
  float b2 = step(abs(p.x - 0.1), 0.12) * step(abs(p.y), 0.08);
  float b3 = step(abs(p.x - 0.45), 0.18) * step(abs(p.y), 0.12);

  return max(b1, max(b2, b3));
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z,1.0);
  vec2 p = (uv*2.0-1.0)*aspect;

  // sky
  vec3 sky = mix(vec3(0.82,0.74,0.66), vec3(0.95,0.9,0.85), uv.y);

  // dust wall
  float d = dust(p);
  vec3 dustCol = vec3(0.75,0.6,0.45) * d;

  // town
  float t = town(p);
  vec3 townCol = vec3(0.1,0.1,0.1) * t;

  vec3 col = sky;
  col = mix(col, dustCol, d);
  col = mix(col, townCol, t);

  // vignette
  vec2 vig_p = vUv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.4, length(vig_p * vec2(1.0, 1.5)));
  col *= vig;

  gl_FragColor = vec4(col,1.0);
}
`;

const vert = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export function HaboobBanner({
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
    } catch(e) { console.error("WebGL error", e); return; }
    if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragHaboobSimple,
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
