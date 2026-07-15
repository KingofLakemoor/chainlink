import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function NovatrixQuantBanner({
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
      fragment: fragNovatrixQuant,
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
          Math.max(1.0, Math.min(gl.canvas.width / gl.canvas.height, 3.0)) // clamp aspect ratio
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

const fragNovatrixQuant = `
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
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p *= 2.3;
    a *= 0.5;
  }
  return f;
}
float ring(vec2 p, float r, float w) {
  float d = abs(length(p) - r);
  return smoothstep(w, 0.0, d);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z, 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // darker, sharper base
  float baseN = fbm(p * 1.8 + uTime * 0.06);
  vec3 col = mix(vec3(0.01, 0.0, 0.04), vec3(0.03, 0.01, 0.08), baseN * 0.9);

  // aggressive core
  float coreR = length(p * vec2(1.0, 0.7));
  float core = smoothstep(0.7, 0.0, coreR);
  float corePulse = 0.5 + 0.5 * sin(uTime * 2.0);
  vec3 coreCol = vec3(0.9, 0.7, 1.0) * corePulse;
  col = mix(col, coreCol, core);

  // double ring
  float r1 = ring(p, 0.5, 0.015);
  float r2 = ring(p, 0.6, 0.015);
  vec3 ringCol = vec3(0.8, 0.6, 1.0);
  col = mix(col, ringCol, (r1 + r2) * 0.9);

  // faster, denser rain
  float rain = 0.0;
  for (int i = -18; i <= 18; i++) {
    float idx = float(i);
    vec2 rp = p;
    rp.x -= idx * 0.16;
    float colMask = step(0.96, fract((rp.x + idx * 0.3) * 6.0));
    float y = rp.y + uTime * 0.9 + idx * 2.17;
    float glyph = step(0.6, fract(y * 18.0));
    float fade = smoothstep(aspect.x + 0.5, 0.0, abs(rp.x));
    rain += colMask * glyph * fade;
  }
  col += vec3(0.9, 0.8, 1.0) * rain * 0.7;

  // sharper ticker
  vec2 tp = p * vec2(1.6, 3.4);
  tp.y += 0.3;
  float band = smoothstep(0.1, 0.0, abs(tp.y));
  float scroll = fract(tp.x + uTime * 0.8);
  float cell = step(0.75, fract(scroll * 16.0));
  vec3 tickerCol = vec3(0.9, 0.9, 1.0);
  col = mix(col, tickerCol, band * cell * 0.9);

  // glitch bands
  float glitch = step(0.97, noise(vec2(uTime * 2.0, p.y * 20.0)));
  col += vec3(1.0, 0.8, 1.0) * glitch * 0.25;

  // vignette
  float vig = smoothstep(1.2, 0.4, length(uv * 2.0 - 1.0));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
