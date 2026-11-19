"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Triangle, Program, Mesh, Color } from "ogl";

export function ViceCityBanner({
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
      console.error("WebGL Error in ViceCityBanner", e);
      return;
    }
    if (!gl) return;

    const geometry = new Triangle(gl as any);
    const program = new Program(gl as any, {
      vertex: vert,
      fragment: fragViceCity,
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
      program.uniforms.uTime.value = 4.2;
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

const fragViceCity = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// Hash & Noise
float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash1_1(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash1(i), hash1(i + vec2(1.0, 0.0)), u.x),
    mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Distance to line segment
float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Palm Frond Leaflet SDF curve
float sdFrond(vec2 p, vec2 origin, vec2 tip, vec2 control, float maxThick) {
  // Quadratic Bezier approximation with 6 sample points
  float d = 1e5;
  vec2 prev = origin;
  for (int i = 1; i <= 8; i++) {
    float t = float(i) / 8.0;
    float it = 1.0 - t;
    vec2 curr = it * it * origin + 2.0 * it * t * control + t * t * tip;
    float thick = maxThick * sin(t * 3.14159);
    float seg = sdSegment(p, prev, curr) - thick;
    d = min(d, seg);
    prev = curr;
  }
  return d;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(clamp(uResolution.z, 1.0, 3.5), 1.0);
  vec2 p = (uv * 2.0 - 1.0) * aspect;

  float horizonY = -0.16;
  bool isSky = (p.y >= horizonY);

  vec3 col = vec3(0.0);

  // ==========================================
  // 1. SKY & SUNSET PALETTE
  // ==========================================
  float skyNormY = clamp((p.y - horizonY) / (1.0 - horizonY + 0.001), 0.0, 1.0);

  // Iconic Miami Vice Twilight Gradient:
  // Golden horizon -> Vivid Coral -> Electric Flamingo Pink -> Deep Magenta -> Midnight Indigo
  vec3 cGold    = vec3(1.00, 0.84, 0.38);
  vec3 cCoral   = vec3(1.00, 0.44, 0.18);
  vec3 cPink    = vec3(0.96, 0.20, 0.54);
  vec3 cMagenta = vec3(0.58, 0.06, 0.46);
  vec3 cIndigo  = vec3(0.08, 0.02, 0.20);

  vec3 sky = mix(cGold, cCoral, smoothstep(0.0, 0.16, skyNormY));
  sky = mix(sky, cPink,    smoothstep(0.16, 0.42, skyNormY));
  sky = mix(sky, cMagenta, smoothstep(0.42, 0.72, skyNormY));
  sky = mix(sky, cIndigo,  smoothstep(0.72, 1.00, skyNormY));

  // Wispy horizontal twilight cloud bands
  float cloud1 = noise(vec2(p.x * 0.9 + uTime * 0.025, p.y * 3.6));
  float cloudStreak = smoothstep(0.48, 0.68, cloud1) * smoothstep(0.40, 0.04, abs(skyNormY - 0.26));
  sky = mix(sky, vec3(1.0, 0.38, 0.48), cloudStreak * 0.35);

  float cloud2 = noise(vec2(p.x * 1.4 - uTime * 0.035, p.y * 4.2 + 2.1));
  float cloudStreak2 = smoothstep(0.50, 0.70, cloud2) * smoothstep(0.35, 0.05, abs(skyNormY - 0.48));
  sky = mix(sky, vec3(0.98, 0.25, 0.65), cloudStreak2 * 0.28);

  // ==========================================
  // 2. SEGMENTED RETRO SYNTHWAVE SUN
  // ==========================================
  vec2 sunPos = vec2(0.25 * aspect.x, -0.02);
  float sunRadius = 0.38;
  vec2 sunP = p - sunPos;
  float sunDist = length(sunP);

  // Outer radial corona glow (extends into sky and ocean)
  float sunCorona = 0.065 / (max(0.001, sunDist - sunRadius) + 0.065);
  vec3 coronaCol = mix(vec3(1.0, 0.72, 0.25), vec3(0.98, 0.15, 0.55), clamp((sunP.y + sunRadius) / (2.0 * sunRadius), 0.0, 1.0));
  sky += coronaCol * sunCorona * 0.42;

  // Sun Disc
  float inSun = smoothstep(0.006, -0.004, sunDist - sunRadius);
  if (inSun > 0.0) {
    float sunYNorm = clamp((sunP.y + sunRadius) / (2.0 * sunRadius), 0.0, 1.0);
    vec3 sunCoreCol = mix(vec3(1.0, 0.22, 0.52), vec3(1.0, 0.94, 0.42), sunYNorm);

    // Horizontal blind slice cutouts (classic 80s synth horizontal slots)
    // Slices become progressively thicker toward the bottom
    float sliceTaper = 1.0 - sunYNorm; // 1 at bottom, 0 at top
    float slotFreq = 58.0;
    float sliceWave = sin(sunP.y * slotFreq - uTime * 0.35);
    float slotThreshold = mix(-0.9, 0.45, pow(sliceTaper, 1.6));
    float sliceCut = step(slotThreshold, sliceWave) * step(0.12, sliceTaper);

    float sunFill = inSun * (1.0 - sliceCut);
    sky = mix(sky, sunCoreCol, sunFill);
  }

  // ==========================================
  // 3. ART DECO WATERFRONT SKYLINE SILHOUETTE
  // ==========================================
  float bldgMask = 0.0;
  vec3 bldgWindows = vec3(0.0);
  vec3 bldgBeacons = vec3(0.0);

  // Row of stylized coastal hotels and towers near the horizon
  if (p.y >= horizonY && p.y <= horizonY + 0.32) {
    // 12 distinct buildings procedural layout
    for (int i = 0; i < 11; i++) {
      float fi = float(i);
      float bCenter = -aspect.x * 0.95 + fi * (aspect.x * 1.9 / 10.0) + sin(fi * 4.3) * 0.10;
      float bWidth = 0.08 + hash1_1(fi * 13.7) * 0.07;
      float bHeight = 0.08 + hash1_1(fi * 7.1) * 0.18;
      float bRoofSpire = step(0.65, hash1_1(fi * 23.1));

      vec2 bp = vec2(p.x - bCenter, p.y - horizonY);

      // Main tower block
      if (abs(bp.x) <= bWidth * 0.5 && bp.y >= 0.0 && bp.y <= bHeight) {
        bldgMask = 1.0;

        // Window grid
        vec2 winUv = vec2(bp.x / bWidth, bp.y / bHeight);
        float winGridX = fract(winUv.x * 6.0);
        float winGridY = fract(winUv.y * 12.0);
        float isWin = step(0.35, winGridX) * step(winGridX, 0.85) *
                      step(0.30, winGridY) * step(winGridY, 0.80);

        // Window light colors: warm amber, neon cyan, or dark room
        float winHash = hash1(floor(vec2(winUv.x * 6.0, winUv.y * 12.0) + fi * 17.0));
        vec3 winCol = (winHash > 0.65) ? vec3(0.20, 0.90, 0.95) :
                      (winHash > 0.30) ? vec3(1.00, 0.85, 0.35) : vec3(0.0);
        float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + winHash * 20.0);
        bldgWindows = max(bldgWindows, winCol * isWin * twinkle * 0.85);
      }

      // Rooftop Spire & Beacon
      if (bRoofSpire > 0.5) {
        float spireW = 0.005;
        float spireH = bHeight + 0.045;
        if (abs(bp.x) <= spireW && bp.y >= bHeight && bp.y <= spireH) {
          bldgMask = 1.0;
        }
        // Blinking red/magenta aircraft beacon
        float beaconDist = length(vec2(bp.x, bp.y - spireH));
        float beaconBlink = smoothstep(0.4, 0.9, sin(uTime * 4.0 + fi * 2.0));
        float beaconLight = 0.003 / (beaconDist + 0.003) * beaconBlink;
        bldgBeacons += vec3(1.0, 0.15, 0.25) * beaconLight;
      }
    }
  }

  // Combine skyline into sky
  vec3 skylineBody = vec3(0.04, 0.02, 0.07);
  sky = mix(sky, skylineBody + bldgWindows, bldgMask);
  sky += bldgBeacons;

  // ==========================================
  // 4. OCEAN WATER & CHROMIUM REFLECTIONS
  // ==========================================
  vec3 water = vec3(0.0);
  if (!isSky) {
    float depth = horizonY - p.y; // 0.0 at horizon, ~0.84 at bottom
    float perspZ = 0.14 / (depth + 0.07);

    // Deep coastal water base
    vec3 deepWater = vec3(0.04, 0.02, 0.09);
    vec3 shallowWater = vec3(0.08, 0.03, 0.14);
    water = mix(shallowWater, deepWater, smoothstep(0.0, 0.5, depth));

    // Wave distortion & ripples
    float wave1 = sin(perspZ * 1.5 - uTime * 2.4 + p.x * 4.0);
    float wave2 = sin(perspZ * 2.8 - uTime * 3.6 - p.x * 6.0);
    float waveComposite = wave1 * 0.6 + wave2 * 0.4;

    // Sun vertical reflection column
    float sunRefWidth = 0.14 + depth * 0.38;
    float sunRefX = abs(p.x - sunPos.x + waveComposite * 0.05);
    float sunColIntensity = smoothstep(sunRefWidth, 0.0, sunRefX);

    // Shimmering reflection colors (golden amber near horizon, hot fuchsia near bottom)
    vec3 sunRefColor = mix(vec3(1.0, 0.88, 0.42), vec3(0.98, 0.22, 0.58), smoothstep(0.0, 0.45, depth));
    float shimmer = 0.5 + 0.5 * sin(perspZ * 3.5 - uTime * 4.0);
    water += sunRefColor * sunColIntensity * (0.6 + 0.4 * shimmer) * 1.35;

    // City lights specular streaks (cyan & neon pink reflection lines)
    float cyanStreak = smoothstep(0.09, 0.0, abs(p.x - (-0.15) + wave1 * 0.04));
    float pinkStreak = smoothstep(0.08, 0.0, abs(p.x - (0.65)  + wave2 * 0.04));
    water += vec3(0.20, 0.92, 0.96) * cyanStreak * (0.4 + 0.6 * waveComposite) * 0.65;
    water += vec3(0.98, 0.18, 0.68) * pinkStreak * (0.4 + 0.6 * wave1) * 0.60;

    // Subtle 80s perspective gridlines on the water/driveway
    float gridX = smoothstep(0.045, 0.0, abs(fract(p.x * 2.6 * perspZ * 0.25) - 0.5) * depth);
    float gridZ = smoothstep(0.040, 0.0, abs(fract(depth * 7.5 - uTime * 0.4) - 0.5) * 0.18);
    vec3 neonGridCol = vec3(0.92, 0.16, 0.65);
    water += neonGridCol * (gridX * 0.18 + gridZ * 0.14) * smoothstep(0.02, 0.25, depth);

    // Ocean swell foam highlights on wave crests
    float crest = smoothstep(0.75, 0.95, waveComposite) * smoothstep(0.05, 0.45, depth);
    water += vec3(0.95, 0.85, 0.90) * crest * 0.25;
  }

  // Base Composite
  col = isSky ? sky : water;

  // Horizon soft haze line
  float horizonGlow = smoothstep(0.04, 0.0, abs(p.y - horizonY));
  col += vec3(1.0, 0.78, 0.45) * horizonGlow * 0.35;

  // ==========================================
  // 5. SILHOUETTE PALM TREES (ICONIC FRAMING)
  // ==========================================
  float palmMask = 0.0;
  vec3 palmRim = vec3(0.0);

  // --- Palm 1: Main Tall Arching Palm (Right Side) ---
  vec2 trunkStart = vec2(aspect.x * 0.96, -0.95);
  vec2 trunkCrown = vec2(aspect.x * 0.62, 0.26);
  vec2 trunkCtrl  = vec2(aspect.x * 0.78, -0.32);

  // Trunk wind sway
  float windSway = sin(uTime * 1.5) * 0.018;
  trunkCrown.x += windSway;

  // Trunk SDF
  float dTrunk = 1e5;
  vec2 prevPt = trunkStart;
  for (int i = 1; i <= 10; i++) {
    float t = float(i) / 10.0;
    float it = 1.0 - t;
    vec2 currPt = it * it * trunkStart + 2.0 * it * t * trunkCtrl + t * t * trunkCrown;
    float thick = mix(0.042, 0.016, t);
    float seg = sdSegment(p, prevPt, currPt) - thick;
    dTrunk = min(dTrunk, seg);
    prevPt = currPt;
  }

  // Palm 1 Fronds (7 radiating curved leaves)
  float dFronds = 1e5;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float ang = 2.4 + fk * 0.45; // Radiating inward and downward
    float leafLen = 0.32 + hash1_1(fk * 5.2) * 0.08;
    float leafSway = sin(uTime * 1.8 + fk * 1.2) * 0.025;

    vec2 dir = vec2(cos(ang + leafSway), sin(ang + leafSway));
    vec2 tip = trunkCrown + dir * leafLen + vec2(0.0, -0.09 * (1.0 + fk * 0.15));
    vec2 ctrl = trunkCrown + dir * (leafLen * 0.55) + vec2(0.0, 0.05);

    float fD = sdFrond(p, trunkCrown, tip, ctrl, 0.018);
    dFronds = min(dFronds, fD);
  }

  // --- Palm 2: Secondary Shorter Palm (Far Right) ---
  vec2 trunk2Start = vec2(aspect.x * 1.05, -0.95);
  vec2 trunk2Crown = vec2(aspect.x * 0.82, 0.08);
  vec2 trunk2Ctrl  = vec2(aspect.x * 0.94, -0.40);
  trunk2Crown.x += windSway * 1.2;

  float dTrunk2 = 1e5;
  vec2 prevPt2 = trunk2Start;
  for (int i = 1; i <= 8; i++) {
    float t = float(i) / 8.0;
    float it = 1.0 - t;
    vec2 currPt2 = it * it * trunk2Start + 2.0 * it * t * trunk2Ctrl + t * t * trunk2Crown;
    float thick = mix(0.034, 0.013, t);
    float seg = sdSegment(p, prevPt2, currPt2) - thick;
    dTrunk2 = min(dTrunk2, seg);
    prevPt2 = currPt2;
  }

  float dFronds2 = 1e5;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float ang = 2.1 + fk * 0.52;
    float leafLen = 0.24 + hash1_1(fk * 3.7) * 0.06;
    float leafSway = sin(uTime * 1.6 + fk * 1.1 + 1.0) * 0.022;

    vec2 dir = vec2(cos(ang + leafSway), sin(ang + leafSway));
    vec2 tip = trunk2Crown + dir * leafLen + vec2(0.0, -0.07);
    vec2 ctrl = trunk2Crown + dir * (leafLen * 0.52) + vec2(0.0, 0.04);

    float fD = sdFrond(p, trunk2Crown, tip, ctrl, 0.015);
    dFronds2 = min(dFronds2, fD);
  }

  // --- Palm 3: Left-Side Framing Palm (Subtle Silhouette in foreground) ---
  vec2 trunk3Start = vec2(-aspect.x * 0.98, -0.95);
  vec2 trunk3Crown = vec2(-aspect.x * 0.76, 0.24);
  vec2 trunk3Ctrl  = vec2(-aspect.x * 0.88, -0.30);
  trunk3Crown.x += windSway * 0.8;

  float dTrunk3 = 1e5;
  vec2 prevPt3 = trunk3Start;
  for (int i = 1; i <= 8; i++) {
    float t = float(i) / 8.0;
    float it = 1.0 - t;
    vec2 currPt3 = it * it * trunk3Start + 2.0 * it * t * trunk3Ctrl + t * t * trunk3Crown;
    float thick = mix(0.038, 0.015, t);
    float seg = sdSegment(p, prevPt3, currPt3) - thick;
    dTrunk3 = min(dTrunk3, seg);
    prevPt3 = currPt3;
  }

  float dFronds3 = 1e5;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float ang = 0.35 + fk * 0.48; // Radiating outward right
    float leafLen = 0.26 + hash1_1(fk * 4.1) * 0.07;
    float leafSway = sin(uTime * 1.7 + fk * 1.3) * 0.022;

    vec2 dir = vec2(cos(ang + leafSway), sin(ang + leafSway));
    vec2 tip = trunk3Crown + dir * leafLen + vec2(0.0, -0.08);
    vec2 ctrl = trunk3Crown + dir * (leafLen * 0.55) + vec2(0.0, 0.04);

    float fD = sdFrond(p, trunk3Crown, tip, ctrl, 0.016);
    dFronds3 = min(dFronds3, fD);
  }

  float dAllPalms = min(min(min(dTrunk, dFronds), min(dTrunk2, dFronds2)), min(dTrunk3, dFronds3));
  palmMask = smoothstep(0.006, -0.003, dAllPalms);

  // Ethereal Neon Rim Lighting catching the windward edges of the palms
  float rimGlow = smoothstep(0.018, 0.002, dAllPalms) * (1.0 - palmMask);
  vec3 rimColor = mix(vec3(0.98, 0.20, 0.65), vec3(0.25, 0.92, 0.98), 0.5 + 0.5 * sin(p.y * 3.0 + uTime));
  palmRim = rimColor * rimGlow * 0.75;

  // Composite Palms
  vec3 palmBodyCol = vec3(0.03, 0.015, 0.05);
  col = mix(col, palmBodyCol, palmMask * 0.95);
  col += palmRim;

  // ==========================================
  // 6. FLOATING NEON EMBERS / DUST MOTES
  // ==========================================
  vec2 moteUv = p * vec2(3.5, 5.0) + vec2(uTime * 0.08, -uTime * 0.18);
  vec2 moteId = floor(moteUv);
  vec2 moteFrac = fract(moteUv) - 0.5;
  float isMote = step(0.984, hash1(moteId));
  float moteDist = length(moteFrac);
  float moteGlow = 0.012 / (moteDist + 0.008) * isMote;
  vec3 moteColor = mix(vec3(1.0, 0.82, 0.35), vec3(0.98, 0.25, 0.65), hash1(moteId * 7.1));
  col += moteColor * moteGlow * (0.6 + 0.4 * sin(uTime * 3.0 + hash1(moteId) * 12.0)) * 0.45;

  // ==========================================
  // 7. RETRO SCANLINES & PROFILE READABILITY SCRIM
  // ==========================================
  // Subtle 80s CRT scanlines
  float scanline = 0.97 + 0.03 * sin(uv.y * uResolution.y * 1.5);
  col *= scanline;

  // Left-side readability scrim so username, rank, and avatar remain 100% crisp and readable
  float leftScrim = smoothstep(0.25, -1.0, uv.x * 2.0 - 1.0);
  col = mix(col, col * 0.55, leftScrim * 0.72);

  // Soft vignette around perimeter
  float vig = smoothstep(1.65, 0.45, length((uv * 2.0 - 1.0) * vec2(1.0, 1.25)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
