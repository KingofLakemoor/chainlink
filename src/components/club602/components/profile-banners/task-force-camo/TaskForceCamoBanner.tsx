"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function TaskForceCamoBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    let mounted = true;
    let renderer: Renderer, gl: WebGLRenderingContext;
    try {
      renderer = new Renderer({ alpha: true, depth: false, antialias: true });
      gl = renderer.gl;
    } catch (e) {
      console.error("WebGL Error", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl as any);
    const program = new Program(gl as any, {
      vertex: vert,
      fragment: fragTaskForceCamo,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            gl.canvas.width || 600,
            gl.canvas.height || 200,
            (gl.canvas.width || 600) / Math.max(1, gl.canvas.height || 200)
          ),
        },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl as any, { geometry, program });

    function resize() {
      if (!container.current) return;
      const w = container.current.offsetWidth;
      const h = container.current.offsetHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      if (program.uniforms.uResolution) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / Math.max(1, gl.canvas.height)
        );
      }
    }

    window.addEventListener("resize", resize);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container.current);
    resize();

    let raf: number | undefined;
    if (isStatic) {
      program.uniforms.uTime.value = 3.6;
      renderer.render({ scene: mesh });
    } else {
      const update = (t: number) => {
        raf = requestAnimationFrame(update);
        program.uniforms.uTime.value = t * 0.001;
        if (mounted) renderer.render({ scene: mesh });
      };
      raf = requestAnimationFrame(update);
    }

    container.current.appendChild(gl.canvas as HTMLCanvasElement);

    return () => {
      mounted = false;
      if (raf !== undefined) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();
      if (container.current && container.current.contains(gl.canvas as HTMLCanvasElement)) {
        container.current.removeChild(gl.canvas as HTMLCanvasElement);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      ref={container}
      className="absolute inset-0 w-full h-full"
      style={{ borderRadius: 8, overflow: "hidden" }}
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

const fragTaskForceCamo = `
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
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p = rot * p * 2.03 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return f;
}

// 5-pointed star SDF
float sdStar5(in vec2 p, in float r, in float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

// Rounded box SDF for tactical dog-tag / chevron framing
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.5), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // --- 1. Multi-Layered Woodland Camo Pattern ---
  // Subtle slow drift for tactical fabric feel
  vec2 camoUv = p * vec2(1.45, 1.75) + vec2(uTime * 0.015, sin(uTime * 0.25) * 0.015);

  // Domain-warped FBM yields authentic interlocking woodland camo shapes
  vec2 warp = vec2(
    fbm(camoUv * 1.1 + vec2(2.4, 1.1)),
    fbm(camoUv * 1.1 + vec2(7.8, 4.3))
  );
  float n1 = fbm(camoUv + warp * 0.85);
  float n2 = fbm(camoUv * 1.45 - warp * 0.65 + vec2(4.2, 9.1));

  // Classic GI Joe / M81 Woodland Camo Palette
  vec3 oliveDrab  = vec3(0.24, 0.30, 0.16);
  vec3 forestGrn  = vec3(0.11, 0.20, 0.10);
  vec3 coyoteTan  = vec3(0.42, 0.36, 0.23);
  vec3 barkBrown  = vec3(0.20, 0.14, 0.09);
  vec3 tacBlack   = vec3(0.05, 0.06, 0.05);

  vec3 col = oliveDrab;
  // Forest green patches
  col = mix(col, forestGrn, smoothstep(0.46, 0.50, n1));
  // Coyote tan streaks
  col = mix(col, coyoteTan, smoothstep(0.56, 0.60, n2) * (1.0 - smoothstep(0.64, 0.68, n1)));
  // Dark brown shapes
  col = mix(col, barkBrown, smoothstep(0.60, 0.64, n1 * 0.6 + n2 * 0.45));
  // Tactical black blobs
  float blackPatch = smoothstep(0.66, 0.70, fbm(camoUv * 1.25 + vec2(13.1, 3.7)));
  col = mix(col, tacBlack, blackPatch);

  // Subtle ripstop / canvas weave micro-texture
  float weaveX = sin(uv.x * uResolution.x * 0.45);
  float weaveY = sin(uv.y * uResolution.y * 0.45);
  float ripstop = 0.94 + 0.06 * (weaveX * weaveY);
  col *= ripstop;

  // --- 2. Tactical Radar / Recon Grid Overlay ---
  vec2 radarCenter = vec2(0.55 * aspect.x, 0.0);
  vec2 rp = p - radarCenter;
  float rDist = length(rp);
  float rAngle = atan(rp.y, rp.x);

  // Faint range rings & crosshair
  float ring1 = smoothstep(0.008, 0.002, abs(rDist - 0.38));
  float ring2 = smoothstep(0.008, 0.002, abs(rDist - 0.68));
  float crossH = smoothstep(0.005, 0.001, abs(rp.y)) * step(rDist, 0.75);
  float crossV = smoothstep(0.005, 0.001, abs(rp.x)) * step(rDist, 0.75);

  // Rotating radar sweep
  float sweepAng = mod(rAngle + uTime * 1.1, 6.2831853);
  float sweepTrail = smoothstep(1.3, 0.0, sweepAng) * smoothstep(0.85, 0.1, rDist);
  vec3 radarGreen = vec3(0.32, 0.92, 0.44);
  col += radarGreen * ((ring1 + ring2) * 0.16 + (crossH + crossV) * 0.10 + sweepTrail * 0.16);

  // --- 3. Classic 80s Action-Hero Red / White / Blue Diagonal Stripe Accent ---
  // Iconic diagonal slash near the bottom-left/center edge
  float diag = (p.x * 0.55 + p.y * 1.15);
  float stripeBand = diag + 0.92;
  float stripeMask = smoothstep(0.02, 0.0, abs(stripeBand) - 0.13);
  float rMask = smoothstep(0.015, 0.0, abs(stripeBand - 0.082) - 0.036);
  float wMask = smoothstep(0.015, 0.0, abs(stripeBand) - 0.034);
  float bMask = smoothstep(0.015, 0.0, abs(stripeBand + 0.082) - 0.036);

  // Dark tactical backing behind the tri-color stripe for crisp contrast
  col = mix(col, vec3(0.04, 0.05, 0.06), stripeMask * 0.85);

  // Metallic glint sweep along stripe
  float glint = 0.85 + 0.35 * sin(p.x * 4.0 - uTime * 2.2);
  vec3 heroRed   = vec3(0.86, 0.12, 0.15) * glint;
  vec3 heroWhite = vec3(0.95, 0.96, 0.98) * glint;
  vec3 heroBlue  = vec3(0.10, 0.28, 0.76) * glint;

  col = mix(col, heroRed,   rMask * 0.92);
  col = mix(col, heroWhite, wMask * 0.92);
  col = mix(col, heroBlue,  bMask * 0.92);

  // --- 4. GI Joe-Inspired Laser / Tracer Streaks (Red & Blue!) ---
  // Classic 80s red & blue laser bolts zipping across the battlefield
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float speed = (i == 0) ? 2.6 : -2.3;
    float yOff = (i == 0) ? 0.34 : -0.22;
    float phase = fract(uTime * 0.38 + fi * 0.52);
    float laserX = mix(-aspect.x * 1.4, aspect.x * 1.4, (i == 0) ? phase : 1.0 - phase);
    vec2 lp = p - vec2(laserX, yOff + p.x * (i == 0 ? 0.07 : -0.06));
    float bolt = smoothstep(0.32, 0.0, abs(lp.x)) * smoothstep(0.022, 0.003, abs(lp.y));
    float boltCore = smoothstep(0.20, 0.0, abs(lp.x)) * smoothstep(0.008, 0.001, abs(lp.y));
    vec3 boltCol = (i == 0) ? vec3(0.25, 0.65, 1.0) : vec3(1.0, 0.22, 0.20);
    col += boltCol * bolt * 0.75 + vec3(1.0) * boltCore * 0.65;
  }

  // --- 5. Brushed-Steel Star & Dog-Tag Emblem (Right Side) ---
  vec2 ep = rp;
  // Subtle tactical dog-tag plate
  float dPlate = sdRoundBox(ep, vec2(0.30, 0.36), 0.07);
  float plateFill = smoothstep(0.012, -0.005, dPlate);
  float plateBorder = smoothstep(0.022, 0.005, abs(dPlate));

  // Brushed metallic texture
  float brush = 0.85 + 0.15 * noise(ep * vec2(4.0, 90.0));
  float spec = pow(max(0.0, 1.0 - abs(ep.x + ep.y * 0.6 - sin(uTime * 0.9) * 0.35)), 6.0);
  vec3 gunmetal = vec3(0.14, 0.16, 0.15) * brush + vec3(0.22, 0.25, 0.22) * spec * 0.45;
  vec3 steelRim = vec3(0.62, 0.66, 0.60) + vec3(0.35) * spec;

  // Soft shadow around tag
  float plateShadow = smoothstep(0.14, 0.0, dPlate) * (1.0 - plateFill);
  col *= (1.0 - plateShadow * 0.55);
  col = mix(col, gunmetal, plateFill * 0.88);
  col = mix(col, steelRim, plateBorder * 0.85);

  // Double chevron stripes below the star
  vec2 cp = ep - vec2(0.0, -0.17);
  float chev1 = smoothstep(0.010, 0.002, abs(abs(cp.x) * 0.65 + cp.y - 0.025) - 0.016) * step(abs(cp.x), 0.18);
  float chev2 = smoothstep(0.010, 0.002, abs(abs(cp.x) * 0.65 + cp.y + 0.035) - 0.016) * step(abs(cp.x), 0.18);
  vec3 goldBrass = vec3(0.92, 0.76, 0.32) + vec3(0.25) * spec;
  col = mix(col, goldBrass, (chev1 + chev2) * plateFill * 0.92);

  // Centered 5-point Hero Star inside plate
  vec2 sp = ep - vec2(0.0, 0.08);
  float dStar = sdStar5(sp, 0.16, 0.38);
  float starFill = smoothstep(0.008, -0.004, dStar);
  float starGlow = smoothstep(0.12, 0.0, dStar) * plateFill;
  vec3 starCol = mix(vec3(0.88, 0.89, 0.92), vec3(1.0, 0.95, 0.78), 0.5 + 0.5 * sin(uTime * 1.6)) + vec3(0.3) * spec;
  col += vec3(0.95, 0.80, 0.35) * starGlow * 0.22;
  col = mix(col, starCol, starFill);

  // --- 6. Subtle Floating Embers / Tactical Sparks ---
  vec2 sparkP = p * vec2(4.0, 6.0) + vec2(uTime * 0.12, -uTime * 0.25);
  float spark = step(0.990, noise(sparkP));
  col += vec3(0.95, 0.72, 0.30) * spark * 0.55;

  // --- 7. Dark Vignette & Left Readability Scrim ---
  // Keep profile avatar & username crisp and legible over camo
  float leftScrim = smoothstep(0.35, -1.1, uv.x * 2.0 - 1.0);
  col = mix(col, col * 0.58, leftScrim * 0.75);

  float vig = smoothstep(1.55, 0.45, length((uv * 2.0 - 1.0) * vec2(1.0, 1.25)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
