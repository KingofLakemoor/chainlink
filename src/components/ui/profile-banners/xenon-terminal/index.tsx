"use client";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";
import React, { useRef, useEffect } from "react";

export function XenonTerminalBanner({ isStatic = false, ...props }: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    const renderer = new Renderer({ alpha: true, depth: false });
    const gl = renderer.gl;
        if (!gl) return;

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
      program.uniforms.uTime.value = 5.0;
      if (mounted) renderer.render({ scene: mesh });
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
      className="absolute inset-0 w-full h-full"
      style={{ borderRadius: "8px", overflow: "hidden" }}
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

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // Background
  vec3 col = vec3(0.04, 0.06, 0.1);

  // Moving perspective grid
  vec2 gridP = p;

  // Create a 3D floor perspective effect
  float horizon = 0.5;
  float y = (gridP.y + horizon);
  if (y > 0.0) {
    vec2 planeP = vec2(gridP.x / y, 1.0 / y);
    planeP.y -= uTime * 2.0; // move grid forward

    // Grid lines
    vec2 gridId = fract(planeP * 5.0);
    float lineW = 0.05 * y; // lines get thinner in distance

    float grid = smoothstep(lineW, 0.0, gridId.x) + smoothstep(lineW, 0.0, gridId.y);
    float fade = smoothstep(0.0, 1.0, y) * smoothstep(1.5, 0.5, length(p));

    col += vec3(0.0, 0.8, 1.0) * grid * fade * 0.5;
  }

  // Terminal text / code falling lines in background
  float fallSpeed = uTime * 1.5;
  float stream = fract(p.x * 20.0);
  float streamId = floor(p.x * 20.0);
  float yOffset = hash(vec2(streamId, 1.0)) * 10.0;
  float streamVal = fract(p.y * 5.0 + fallSpeed * (0.5 + hash(vec2(streamId, 2.0))) + yOffset);

  float charMask = step(0.8, noise(p * 50.0 + uTime * 10.0));
  float textAlpha = smoothstep(0.0, 0.2, streamVal) * smoothstep(1.0, 0.8, streamVal);
  col += vec3(0.0, 1.0, 0.8) * charMask * textAlpha * 0.15;

  // Scanline overlay
  float scanline = sin(uv.y * 150.0) * 0.04;
  col -= scanline;

  // Screen refresh bar
  float refresh = smoothstep(0.0, 0.05, fract(uv.y - uTime * 0.4)) * smoothstep(0.1, 0.05, fract(uv.y - uTime * 0.4));
  col += vec3(0.0, 0.5, 1.0) * refresh * 0.1;

  // Vignette
  float vig = smoothstep(1.5, 0.4, length(uv * 2.0 - 1.0));
  col *= vig;

  // Overall terminal tint
  col *= vec3(0.8, 0.95, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`