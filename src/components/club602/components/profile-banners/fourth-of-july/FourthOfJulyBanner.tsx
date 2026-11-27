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
    let renderer: any, gl: any;
    try {
      renderer = new Renderer({ alpha: true, depth: false, antialias: true });
      gl = renderer.gl;
    } catch (e) {
      console.error("WebGL Error in FourthOfJulyBanner", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: fragFourthOfJuly,
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

    container.current.appendChild(gl.canvas);

    return () => {
      mounted = false;
      if (raf !== undefined) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (container.current?.contains(gl.canvas)) {
        container.current.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [isStatic]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 8,
        overflow: "hidden",
      }}
      {...props}
    >
      <div
        ref={container}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />
      {/* Precision Metallic Patriotic Chain-Shield Insignia */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: "8%",
          pointerEvents: "none",
        }}
      >
        <svg
          width="114"
          height="114"
          viewBox="0 0 120 120"
          fill="none"
          style={{
            filter:
              "drop-shadow(0 0 22px rgba(10, 24, 76, 0.95)) drop-shadow(0 0 12px rgba(220, 38, 38, 0.45)) drop-shadow(0 0 16px rgba(245, 197, 24, 0.5))",
          }}
        >
          <defs>
            {/* Chiseled Titanium Gold Rim */}
            <linearGradient id="fojGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF275" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            {/* Deep Midnight Naval Crest Plate */}
            <linearGradient id="fojNavy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="40%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Crimson Honor Gradient */}
            <linearGradient id="fojCrimson" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#B91C1C" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>

            {/* Radiant Titanium Silver */}
            <linearGradient id="fojSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
          </defs>

          {/* Outer Diamond Sunburst Flares */}
          <polygon points="60,8 65,22 60,18 55,22" fill="url(#fojGold)" opacity="0.9" />
          <polygon points="60,112 65,98 60,102 55,98" fill="url(#fojGold)" opacity="0.9" />
          <polygon points="8,60 22,65 18,60 22,55" fill="url(#fojGold)" opacity="0.9" />
          <polygon points="112,60 98,65 102,60 98,55" fill="url(#fojGold)" opacity="0.9" />

          {/* Outer Chiseled Vanguard Shield */}
          <path
            d="M60 14 L98 28 L86 86 L60 106 L34 86 L22 28 Z"
            fill="url(#fojNavy)"
            stroke="url(#fojGold)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Inset Shield Border */}
          <path
            d="M60 22 L91 33 L81 81 L60 97 L39 81 L29 33 Z"
            fill="#050B18"
            stroke="url(#fojSilver)"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Canton Chevron in Upper Half */}
          <path
            d="M60 22 L91 33 L86 54 L60 54 L34 54 L29 33 Z"
            fill="#0A1838"
            stroke="#1D4ED8"
            strokeWidth="0.8"
          />

          {/* Canton Stars */}
          <polygon points="60,26 62,31 67,31 63,34 65,39 60,36 55,39 57,34 53,31 58,31" fill="#FFFFFF" />
          <polygon points="46,36 47.5,40 51.5,40 48.5,42.5 50,46.5 46,44 42,46.5 43.5,42.5 40.5,40 44.5,40" fill="#E2E8F0" opacity="0.9" />
          <polygon points="74,36 75.5,40 79.5,40 76.5,42.5 78,46.5 74,44 70,46.5 71.5,42.5 68.5,40 72.5,40" fill="#E2E8F0" opacity="0.9" />

          {/* Patriotic Vertical Stripes in Lower Crest Section */}
          <clipPath id="stripesClip">
            <path d="M60 54 L86 54 L81 81 L60 97 L39 81 L34 54 Z" />
          </clipPath>
          <g clipPath="url(#stripesClip)">
            <rect x="30" y="54" width="60" height="46" fill="#F8FAFC" />
            <rect x="36" y="54" width="7" height="46" fill="url(#fojCrimson)" />
            <rect x="50" y="54" width="7" height="46" fill="url(#fojCrimson)" />
            <rect x="63" y="54" width="7" height="46" fill="url(#fojCrimson)" />
            <rect x="77" y="54" width="7" height="46" fill="url(#fojCrimson)" />
          </g>

          {/* Interlocking ChainLink Vanguard Emblem */}
          {/* Left Link */}
          <rect
            x="44"
            y="54"
            width="22"
            height="14"
            rx="7"
            transform="rotate(-26 55 61)"
            fill="none"
            stroke="url(#fojGold)"
            strokeWidth="3.2"
            style={{ filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))" }}
          />
          {/* Right Link */}
          <rect
            x="54"
            y="54"
            width="22"
            height="14"
            rx="7"
            transform="rotate(26 65 61)"
            fill="none"
            stroke="url(#fojSilver)"
            strokeWidth="3.2"
            style={{ filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.7))" }}
          />

          {/* Lower Ribbon / Banner Plate */}
          <path
            d="M36 86 L60 81 L84 86 L80 94 L60 90 L40 94 Z"
            fill="url(#fojGold)"
            stroke="#92400E"
            strokeWidth="0.8"
          />
          <text
            x="60"
            y="89"
            textAnchor="middle"
            fill="#1E293B"
            fontSize="6"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="1.4"
          >
            JULY 4
          </text>
        </svg>
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

const fragFourthOfJuly = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// Hash function
float hash12(vec2 p) {
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// 2D Value Noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 5-Point Star SDF
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

// Fireworks bursting function
vec3 renderFirework(vec2 p, vec2 center, float startTime, vec3 fColor) {
  float age = uTime - startTime;
  if (age < 0.0 || age > 2.2) return vec3(0.0);

  vec2 rel = p - center;
  float dist = length(rel);
  float burstRadius = 0.42 * (1.0 - exp(-age * 2.8));
  
  // Radial burst spark points
  float angle = atan(rel.y, rel.x);
  float sparks = sin(angle * 18.0 + sin(angle * 6.0));
  float sparkRing = smoothstep(0.045, 0.0, abs(dist - burstRadius)) * smoothstep(0.3, 0.9, sparks);

  // Core flash
  float flash = exp(-age * 7.0) * smoothstep(0.18, 0.0, dist);

  // Spark sparkle shimmer
  float twinkle = sin(angle * 24.0 + uTime * 25.0) * 0.5 + 0.5;
  float intensity = (sparkRing * (0.8 + 0.6 * twinkle) + flash * 2.0) * exp(-age * 1.4);

  return fColor * max(0.0, intensity);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.z, 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  // --- Organic Flag Ripple Wave Distortion ---
  float ripple1 = sin(p.x * 3.8 + uTime * 2.2) * 0.035;
  float ripple2 = sin(p.x * 6.5 - uTime * 1.5 + p.y * 2.0) * 0.015;
  float waveOffset = ripple1 + ripple2;

  vec2 wp = p;
  wp.y += waveOffset;

  // --- Majestic Background Palette ---
  // Midnight Naval Sky to Deep Regal Azure
  vec3 darkNavy = vec3(0.02, 0.05, 0.14);
  vec3 royalBlue = vec3(0.05, 0.16, 0.42);
  vec3 deepCrimson = vec3(0.68, 0.06, 0.14);
  vec3 brightRuby = vec3(0.92, 0.12, 0.18);
  vec3 silkWhite = vec3(0.96, 0.96, 0.98);
  vec3 goldAccent = vec3(1.0, 0.82, 0.22);

  // Base patriotic horizon lighting
  vec3 col = mix(darkNavy, royalBlue, clamp(uv.y * 1.1 + uv.x * 0.2, 0.0, 1.0));

  // --- Silk Ripple Stripes (Waving Across Upper/Lower Space) ---
  float stripePhase = (wp.y + 0.9) * 4.2;
  float stripeFactor = sin(stripePhase * 3.14159);
  float isRed = smoothstep(-0.08, 0.08, stripeFactor);

  vec3 stripeColor = mix(silkWhite, mix(deepCrimson, brightRuby, 0.5 + 0.5 * sin(wp.x * 2.0)), isRed);

  // Silk fabric lighting folds
  float foldLight = sin(p.x * 3.8 + uTime * 2.2) * 0.18;
  stripeColor += vec3(foldLight);

  // Blend stripes with backdrop in an angled dynamic wave
  float flagBlend = smoothstep(-0.6, 0.4, p.x * 0.6 - p.y * 0.7);
  col = mix(col, stripeColor, flagBlend * 0.68);

  // --- Blue Canton Stars Field on Left Hemisphere ---
  vec2 cantonUv = (uv - vec2(0.03, 0.35)) * vec2(2.8, 2.0);
  if (cantonUv.x > 0.0 && cantonUv.x < 1.15 && cantonUv.y > 0.0 && cantonUv.y < 1.0) {
    // Canton navy overlay
    vec3 cantonNavy = vec3(0.03, 0.09, 0.28);
    float cantonMask = smoothstep(1.15, 0.95, cantonUv.x) * smoothstep(1.0, 0.85, cantonUv.y);
    col = mix(col, cantonNavy, cantonMask * 0.85);

    // Grid of Stars
    vec2 starCell = fract(cantonUv * vec2(3.5, 4.0)) - 0.5;
    float starDist = sdStar5(starCell, 0.22, 0.48);
    float starGlow = smoothstep(0.02, -0.02, starDist);
    float starHalo = 0.03 / (abs(starDist) + 0.04);

    // Star twinkle
    float twinkle = 0.75 + 0.25 * sin(uTime * 3.5 + cantonUv.x * 12.0 + cantonUv.y * 8.0);
    col += (silkWhite * starGlow + goldAccent * starHalo * 0.25) * twinkle * cantonMask;
  }

  // --- Dynamic Fireworks Display in Sky (3 Staggered Explosions) ---
  float t = mod(uTime, 3.5);
  // Firework 1: Brilliant Crimson/Gold burst (top-left/center)
  col += renderFirework(p, vec2(-0.45, 0.32), 0.2, vec3(1.0, 0.25, 0.22));
  // Firework 2: Radiant White/Silver burst (center-high)
  col += renderFirework(p, vec2(0.12, 0.48), 1.3, vec3(0.9, 0.95, 1.0));
  // Firework 3: Electrifying Royal Blue/Gold burst (top-right)
  col += renderFirework(p, vec2(0.68, 0.38), 2.2, vec3(0.3, 0.65, 1.0));

  // --- Drifting Patriotic Ember / Sparkle Dust ---
  vec2 sparkUv = uv * vec2(14.0, 8.0);
  sparkUv.y -= uTime * 0.9;
  sparkUv.x += sin(sparkUv.y * 0.8 + uTime) * 0.5;
  vec2 sparkCell = fract(sparkUv) - 0.5;
  float sparkDist = length(sparkCell);
  float sparkId = hash12(floor(sparkUv));
  if (sparkId > 0.86) {
    float sparkPulse = 0.5 + 0.5 * sin(uTime * 10.0 + sparkId * 60.0);
    float sparkCore = smoothstep(0.08, 0.01, sparkDist) * sparkPulse;
    vec3 sparkColor = mix(goldAccent, silkWhite, fract(sparkId * 13.0));
    col += sparkColor * sparkCore * 0.9;
  }

  // --- Sheen Sweep across banner ---
  float sweep = mod(uTime * 0.45, 4.0) - 2.0;
  float sweepDist = abs(p.x - p.y * 0.5 - sweep);
  float sweepGlow = smoothstep(0.28, 0.0, sweepDist);
  col += vec3(0.95, 0.92, 1.0) * sweepGlow * 0.18;

  // --- Vignette & Edge Shadowing ---
  vec2 vigP = uv * 2.0 - 1.0;
  float vig = smoothstep(1.5, 0.45, length(vigP * vec2(1.0, 1.25)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
