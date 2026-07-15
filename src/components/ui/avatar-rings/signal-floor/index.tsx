import React, { useRef, useEffect, useState } from 'react';
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';

const vert = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
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

float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv * 2.0 - 1.0);
  
  float r = length(p);
  float inner = 0.82;
  float outer = 1.0;
  float ringMask = smoothstep(inner - 0.02, inner + 0.02, r) * (1.0 - smoothstep(outer - 0.02, outer + 0.02, r));
  
  if (ringMask <= 0.01) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // base: dark trading floor
  float baseN = fbm(p * 1.4 + uTime * 0.03);
  vec3 col = mix(vec3(0.01, 0.02, 0.03), vec3(0.01, 0.06, 0.05), baseN * 0.7);
  
  // subtle depth grid
  vec2 g = p * vec2(2.4, 2.0);
  float gx = smoothstep(0.02, 0.0, abs(fract(g.x + 0.5) - 0.5));
  float gy = smoothstep(0.02, 0.0, abs(fract(g.y + 0.5) - 0.5));
  float grid = (gx + gy) * 0.5;
  col += vec3(0.0, 0.25, 0.18) * grid * 0.25;
  
  // horizontal signal bands sweeping
  float bandY = p.y * 3.0 + uTime * 0.6;
  float band = smoothstep(0.12, 0.0, abs(fract(bandY) - 0.5));
  vec3 bandCol = vec3(0.0, 0.9, 0.6);
  col += bandCol * band * 0.35;
  
  // vertical odds columns
  float columns = 0.0;
  for (int i = -6; i <= 6; i++) {
    float idx = float(i);
    float x = p.x - idx * 0.22;
    float colMask = smoothstep(0.03, 0.0, abs(x));
    float y = p.y * 3.0 + uTime * (0.4 + 0.05 * idx);
    float tick = step(0.8, fract(y * 6.0 + hash(vec2(idx, 0.0))));
    columns += colMask * tick;
  }
  vec3 oddsCol = vec3(0.0, 1.0, 0.7);
  col += oddsCol * columns * 0.35;
  
  // priority feed pulse (center band)
  float pf = smoothstep(0.08, 0.0, abs(p.y + 0.25));
  float pfPulse = 0.6 + 0.4 * sin(uTime * 1.4);
  vec3 pfCol = vec3(0.0, 1.0, 0.6) * pfPulse;
  col = mix(col, pfCol, pf * 0.6);
  
  // tiny particles
  float particles = step(0.995, noise(p * 8.0 + uTime * 0.9));
  col += vec3(0.8, 1.0, 0.9) * particles * 0.15;
  
  // Add a nice border glow to define the ring better
  col += vec3(0.0, 0.8, 0.5) * 0.5 * smoothstep(0.82, 0.85, r) * smoothstep(1.0, 0.97, r);
  
  gl_FragColor = vec4(col * ringMask, ringMask);
}
`;

export function SignalFloorAvatarRing({ isStatic = false, ...props }: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;
        const ctn = ctnDom.current;

        let renderer, gl;
        try {
          renderer = new Renderer({
            alpha: true,
            depth: false,
        });
        gl = renderer.gl;
        } catch(e) { console.error("WebGL Error", e); return; }
        if (!gl) return;

        function resize() {
            if (!ctnDom.current) return;
            renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
        }

        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(ctn);
        resize();

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

        let animateId: number;
        if (isStatic) {
            program.uniforms.uTime.value = 5.0;
            if (mounted) renderer.render({ scene: mesh });
        } else {
            const update = (t: number) => {
                animateId = requestAnimationFrame(update);
                program.uniforms.uTime.value = t * 0.001;
                if (mounted) renderer.render({ scene: mesh });
            };
            animateId = requestAnimationFrame(update);
        }

        ctn.appendChild(gl.canvas);

        return () => {
            mounted = false;
            if (animateId) cancelAnimationFrame(animateId);
            resizeObserver.disconnect();
            if (ctnDom.current && ctnDom.current.contains(gl.canvas)) {
                ctnDom.current.removeChild(gl.canvas);
            }
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic]);

    return (
        <div
            ref={ctnDom}
            className="w-full h-full relative"
            {...props}
        />
    );
}
