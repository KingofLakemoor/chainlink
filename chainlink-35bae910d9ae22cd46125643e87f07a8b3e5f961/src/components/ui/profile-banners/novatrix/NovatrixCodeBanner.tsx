import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function NovatrixCodeBanner({
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
      fragment: fragNovatrixCode,
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

const fragNovatrixCode = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// hash / noise / fbm
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

// ring mask
float ring(vec2 p, float r, float w) {
  float d = abs(length(p) - r);
  return smoothstep(w, 0.0, d);
}

// vertical code rain columns
float codeColumn(vec2 p, float colIndex, float speed, float density) {
  float x = p.x + colIndex;
  float col = step(0.98, fract(x * density));
  float y = p.y + uTime * speed + colIndex * 3.17;
  float glyph = step(0.7, fract(y * 12.0));
  return col * glyph;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z, 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // base: deep violet digital void
  float baseN = fbm(p * 1.4 + uTime * 0.03);
  vec3 col = mix(vec3(0.02, 0.01, 0.05), vec3(0.05, 0.02, 0.12), baseN * 0.7);

  // soft fog
  float fog = fbm(p * vec2(1.0, 0.6) + vec2(0.0, uTime * 0.02));
  col += vec3(0.08, 0.03, 0.15) * fog * 0.4;

  // central quant core
  float coreR = length(p * vec2(1.0, 0.8));
  float core = smoothstep(0.6, 0.0, coreR);
  float corePulse = 0.6 + 0.4 * sin(uTime * 1.1);
  vec3 coreCol = vec3(0.6, 0.4, 1.0) * corePulse;
  col = mix(col, coreCol, core * 0.8);

  // Novatrix ring
  float r = ring(p, 0.55, 0.02);
  float ringPulse = 0.5 + 0.5 * sin(uTime * 0.7 + coreR * 6.0);
  vec3 ringCol = mix(vec3(0.3, 0.1, 0.6), vec3(0.8, 0.6, 1.0), ringPulse);
  col = mix(col, ringCol, r);

  // vertical code rain
  float rain = 0.0;
  for (int i = -15; i <= 15; i++) {
    float idx = float(i);
    vec2 rp = p;
    rp.x -= idx * 0.18;
    float c = codeColumn(rp * vec2(1.0, 1.4), idx * 1.37, 0.35, 4.0);
    float fade = smoothstep(aspect.x + 0.5, 0.0, abs(rp.x));
    rain += c * fade;
  }
  vec3 rainCol = vec3(0.7, 0.6, 1.0);
  col += rainCol * rain * 0.45;

  // horizontal ticker band
  vec2 tp = p * vec2(1.4, 3.0);
  tp.y += 0.35;
  float band = smoothstep(0.12, 0.0, abs(tp.y));
  float tickerScroll = fract(tp.x + uTime * 0.4);
  float tickerCell = step(0.8, fract(tickerScroll * 12.0));
  vec3 tickerCol = vec3(0.8, 0.7, 1.0);
  col = mix(col, tickerCol, band * tickerCell * 0.7);

  // scanlines
  float scan = sin(p.y * 80.0 + uTime * 4.0) * 0.5 + 0.5;
  col *= 0.9 + 0.1 * scan;

  // tiny particles
  float particles = step(0.995, noise(p * 8.0 + uTime * 0.9));
  col += vec3(0.9, 0.8, 1.0) * particles * 0.18;

  // vignette
  float vig = smoothstep(1.2, 0.4, length(uv * 2.0 - 1.0));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
