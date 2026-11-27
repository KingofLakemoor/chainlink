import { Renderer, Triangle, Program, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const blackFridayVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const blackFridayFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    // Pseudorandom hash
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // 2D Value Noise
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    // Fractional Brownian Motion for midnight smoke/onyx silk
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(uTime * 0.05);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // --- BFBS True Pitch Obsidian & Matte Black Foundation ---
        // Base transitions between pure pitch black (#030304) and dark gunmetal (#09090b)
        vec3 trueBlack = vec3(0.012, 0.012, 0.015);
        vec3 onyxShade = vec3(0.035, 0.035, 0.042);
        vec3 col = mix(trueBlack, onyxShade, vUv.y * 0.8 + 0.2 * sin(uv.x * 1.5));

        // --- Flowing Carbon Smoke / Velvet Ripple Ribbon ---
        vec2 flowUv = uv * vec2(1.2, 2.0);
        flowUv.x += uTime * 0.12;
        float smoke = fbm(flowUv + vec2(0.0, sin(uv.x * 2.0 + uTime * 0.4) * 0.3));
        col += vec3(0.03, 0.03, 0.038) * smoothstep(0.3, 0.8, smoke);

        // --- Sleek Angled BFBS Carbon Weave / Matte Slits ---
        float carbonStripe = sin((uv.x + uv.y * 1.8) * 45.0);
        col += vec3(0.018) * smoothstep(0.7, 1.0, carbonStripe);

        // --- Subtle Black Friday Anodized Gold & Cranberry Thermal Sheen ---
        // Ultra-fine razor light sweeps across the obsidian surface
        float sweepPos = mod(uTime * 0.35, 3.5) - 1.75;
        float sweepDist = abs(uv.x + uv.y * 0.5 - sweepPos);
        float sweepPulse = smoothstep(0.25, 0.0, sweepDist);
        
        // Deep stealth harvest gold (#D4AF37) and smoked crimson ruby accents
        vec3 stealthGold = vec3(0.85, 0.70, 0.22);
        vec3 roastCranberry = vec3(0.55, 0.04, 0.10);
        vec3 sweepColor = mix(stealthGold, roastCranberry, sin(uv.x * 3.0 + uTime) * 0.5 + 0.5);
        col += sweepColor * sweepPulse * 0.22;

        // --- Drifting Smoked Black-Chrome / Spark Embers ---
        vec2 emberUv = uv;
        emberUv.y -= uTime * 0.7;
        emberUv.x += sin(emberUv.y * 3.5 + uTime * 1.2) * 0.08;

        vec2 emberGrid = vec2(32.0, 16.0);
        vec2 emberId = floor(emberUv * emberGrid);
        vec2 emberSt = fract(emberUv * emberGrid) - 0.5;

        float isEmber = step(0.955, hash(emberId + 7.89));
        float emberPulse = 0.5 + 0.5 * sin(uTime * 5.0 + hash(emberId) * 6.28);
        float emberGlow = 0.007 / (length(emberSt) + 0.003) * isEmber * emberPulse;

        vec3 emberColor = mix(stealthGold * 0.8, vec3(0.9, 0.95, 1.0), hash(emberId + 2.1));
        col += emberColor * emberGlow * 0.65;

        // --- High-Gloss Razor Specular Highlight Lines ---
        float razor1 = smoothstep(0.02, 0.0, abs(uv.y - 0.28 - sin(uv.x * 1.6 + uTime * 0.6) * 0.05));
        float razor2 = smoothstep(0.015, 0.0, abs(uv.y + 0.32 + cos(uv.x * 2.0 - uTime * 0.5) * 0.04));
        col += vec3(0.12, 0.12, 0.14) * (razor1 + razor2);

        // Left-side avatar protection scrim (darkens behind user ring & name)
        float leftScrim = smoothstep(-1.3, 0.2, uv.x);
        col *= mix(0.55, 1.0, leftScrim);

        // Subtle outer edge vignette
        col *= (1.0 - smoothstep(1.1, 2.2, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface BlackFridayBFBSBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function BlackFridayBFBSBanner({ isStatic = false, ...props }: BlackFridayBFBSBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ctnDom.current) return;
        const container = ctnDom.current;
        container.innerHTML = '';

        if (isStatic) return;

        let renderer: Renderer | null = null;
        let animationFrameId: number;

        try {
            renderer = new Renderer({
                alpha: true,
                premultipliedAlpha: false,
                antialias: true,
                dpr: Math.min(window.devicePixelRatio || 1, 2),
            });

            const gl = renderer.gl;
            gl.clearColor(0.01, 0.01, 0.01, 1);
            container.appendChild(gl.canvas);

            const geometry = new Triangle(gl);
            const program = new Program(gl, {
                vertex: blackFridayVert,
                fragment: blackFridayFrag,
                uniforms: {
                    uTime: { value: 0 },
                    uResolution: {
                        value: [
                            container.offsetWidth,
                            container.offsetHeight,
                            container.offsetWidth / (container.offsetHeight || 1),
                        ],
                    },
                },
            });

            const mesh = new Mesh(gl, { geometry, program });

            const handleResize = () => {
                if (!container || !renderer) return;
                const width = container.offsetWidth;
                const height = container.offsetHeight;
                renderer.setSize(width, height);
                program.uniforms.uResolution.value = [width, height, width / (height || 1)];
            };

            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);
            handleResize();

            let startTime = performance.now();
            const update = (now: number) => {
                animationFrameId = requestAnimationFrame(update);
                program.uniforms.uTime.value = (now - startTime) * 0.001;
                renderer?.render({ scene: mesh });
            };

            animationFrameId = requestAnimationFrame(update);

            return () => {
                cancelAnimationFrame(animationFrameId);
                resizeObserver.disconnect();
                if (gl.canvas.parentElement) {
                    gl.canvas.parentElement.removeChild(gl.canvas);
                }
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            };
        } catch (e) {
            console.error("WebGL initialization error in BlackFridayBFBSBanner:", e);
        }
    }, [isStatic]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "8px", overflow: "hidden" }} {...props}>
            <div ref={ctnDom} className="uvc__container" />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "10%", pointerEvents: "none" }}>
                {/* Black Friday BFBS Moneysink Championship Crest */}
                <svg width="112" height="112" viewBox="0 0 120 120" fill="none" style={{ filter: "drop-shadow(0px 0px 18px rgba(0, 0, 0, 0.95)) drop-shadow(0px 0px 8px rgba(212, 175, 55, 0.4))" }}>
                    <defs>
                        {/* Stealth Titanium Carbon Gradient */}
                        <linearGradient id="bfbsTitanium" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3F3F46" />
                            <stop offset="45%" stopColor="#18181B" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>

                        {/* Matte Onyx Plate */}
                        <linearGradient id="bfbsMatte" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#27272A" />
                            <stop offset="100%" stopColor="#09090B" />
                        </linearGradient>

                        {/* Subtle Anodized Black Friday Gold */}
                        <linearGradient id="bfbsGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FDE047" />
                            <stop offset="40%" stopColor="#CA8A04" />
                            <stop offset="85%" stopColor="#713F12" />
                            <stop offset="100%" stopColor="#3F2104" />
                        </linearGradient>

                        {/* Subtle Smoked Cranberry Wine Glow */}
                        <linearGradient id="bfbsCranberry" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#991B1B" />
                            <stop offset="100%" stopColor="#450A0A" />
                        </linearGradient>
                    </defs>

                    {/* Outer Geometric Stealth Diamond Fan (Abstract Turkey Plume Silhouettes in BFBS Blackout) */}
                    <path d="M60 64 L22 42 C19 35 24 24 33 26 L60 58 Z" fill="url(#bfbsMatte)" stroke="#27272A" strokeWidth="1" />
                    <path d="M60 64 L34 26 C36 18 46 13 53 19 L60 58 Z" fill="url(#bfbsTitanium)" stroke="#52525B" strokeWidth="1" />
                    <path d="M60 64 L52 14 C56 6 64 6 68 14 L60 58 Z" fill="url(#bfbsMatte)" stroke="url(#bfbsGold)" strokeWidth="1" />
                    <path d="M60 64 L67 19 C74 13 84 18 86 26 L60 58 Z" fill="url(#bfbsTitanium)" stroke="#52525B" strokeWidth="1" />
                    <path d="M60 64 L87 26 C96 24 101 35 98 42 L60 58 Z" fill="url(#bfbsMatte)" stroke="#27272A" strokeWidth="1" />

                    {/* Outer Chiseled Stealth Carbon Shield */}
                    <path d="M60 26 L96 42 L85 96 L60 112 L35 96 L24 42 Z" fill="url(#bfbsTitanium)" stroke="url(#bfbsGold)" strokeWidth="2" />

                    {/* Inner Pitch Black Core Plate */}
                    <path d="M60 32 L90 46 L81 91 L60 104 L39 91 L30 46 Z" fill="#09090B" stroke="#27272A" strokeWidth="1.2" />

                    {/* Loose Thanksgiving Turkey Silhouette / Modern Blackout Monogram */}
                    {/* Stealth Turkey Head & Neck Silhouette */}
                    <path d="M55 46 C55 38 65 38 65 46 C65 50 63 53 64 58 C65 62 69 66 68 71 C67 75 64 78 60 78 C56 78 53 75 52 71 C51 66 55 62 56 58 C57 53 55 50 55 46 Z" fill="url(#bfbsTitanium)" stroke="#52525B" strokeWidth="0.8" />

                    {/* Sleek Minimalist Gold Beak */}
                    <polygon points="64,47 72,50 64,53" fill="url(#bfbsGold)" stroke="#3F2104" strokeWidth="0.5" />

                    {/* Subtle Smoked Cranberry Snood Accent */}
                    <path d="M64,49 C67,49 69,53 68,57 C67,61 64,63 63,64 C62,63 62,60 63,57 C64,54 62,51 64,49 Z" fill="url(#bfbsCranberry)" stroke="#713F12" strokeWidth="0.5" />

                    {/* Piercing Black Diamond Eye */}
                    <circle cx="61" cy="44" r="1.6" fill="#FDE047" />
                    <circle cx="61.3" cy="43.7" r="0.5" fill="#FFFFFF" />

                    {/* Crossed Blackout Wishbone & Carbon Football (Loose Thanksgiving nod) */}
                    {/* Stealth Wishbone */}
                    <path d="M48 94 C48 84 56 78 60 78 C64 78 72 84 72 94 C72 96 70 96 69 95 C69 87 63 82 60 82 C57 82 51 87 51 95 C50 96 48 96 48 94 Z" fill="url(#bfbsGold)" opacity="0.85" />
                    {/* Football Center Emblem */}
                    <ellipse cx="60" cy="94" rx="11" ry="6" fill="#18181B" stroke="url(#bfbsGold)" strokeWidth="1" transform="rotate(-10 60 94)" />
                    <line x1="55" y1="94" x2="65" y2="92" stroke="#FDE047" strokeWidth="1" />
                    <line x1="58" y1="92" x2="57.5" y2="94" stroke="#A1A1AA" strokeWidth="0.8" />
                    <line x1="61" y1="91.5" x2="60.5" y2="93.5" stroke="#A1A1AA" strokeWidth="0.8" />

                    {/* "BFBS" Blackout Stamp Banner across shield waist */}
                    <rect x="36" y="66" width="48" height="12" rx="2" fill="#09090B" stroke="url(#bfbsGold)" strokeWidth="1" />
                    <text x="60" y="75" textAnchor="middle" fill="#FAFAFA" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.8">BFBS</text>
                </svg>
            </div>
        </div>
    );
}
