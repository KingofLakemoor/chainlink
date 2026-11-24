import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const gobblerVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const gobblerFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(17.31, 89.71))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // Rich Thanksgiving Dusk Base: Deep roasted chestnut (#160B05) to smoked crimson-gold
        vec3 bgDeep = vec3(0.08, 0.04, 0.02);
        vec3 bgWarm = vec3(0.24, 0.09, 0.03);
        vec3 col = mix(bgDeep, bgWarm, vUv.y * 0.75 + 0.25 * sin(uv.x * 0.9 + uTime * 0.4));

        // Radiating Golden-Amber Harvest Sunburst & Wild Turkey Tail Fan Glow
        float distToCenter = length(uv - vec2(0.0, -0.15));
        float angle = atan(uv.y - (-0.15), uv.x);
        
        // 9 distinct radiant fan feather rays
        float rays = sin(angle * 9.0 + sin(uTime * 1.2 + distToCenter * 3.0) * 0.35);
        rays = smoothstep(-0.2, 0.9, rays);
        
        // Warm autumn fan colors: copper amber, golden maize, rich cranberry
        vec3 copperAmber = vec3(0.95, 0.52, 0.12);
        vec3 harvestGold = vec3(1.0, 0.78, 0.22);
        vec3 cranberryRed = vec3(0.72, 0.11, 0.16);

        float fanMask = smoothstep(1.3, 0.15, distToCenter);
        vec3 fanCol = mix(cranberryRed, harvestGold, rays * 0.7 + 0.3 * sin(angle * 3.0 + uTime));
        col += fanCol * rays * fanMask * 0.45;

        // Roasting Hearth Fire / Glowing Embers Drifting Upward
        vec2 emberUv = uv;
        emberUv.y -= uTime * 0.95;
        emberUv.x += sin(emberUv.y * 4.0 + uTime * 1.5) * 0.12;

        vec2 emberGrid = vec2(28.0, 14.0);
        vec2 emberId = floor(emberUv * emberGrid);
        vec2 emberSt = fract(emberUv * emberGrid) - 0.5;

        float isEmber = step(0.93, hash(emberId));
        float emberPulse = 0.6 + 0.4 * sin(uTime * 4.0 + hash(emberId) * 6.28);
        float emberGlow = 0.009 / (length(emberSt) + 0.003) * isEmber * emberPulse;

        vec3 emberColor = mix(copperAmber, harvestGold, hash(emberId + 1.3));
        col += emberColor * emberGlow * 0.85;

        // Golden Champion Laurel Wave Ribbons weaving through the base
        float ribbonY = sin(uv.x * 2.2 + uTime * 1.8) * 0.18 - 0.25;
        float ribbonDist = abs(uv.y - ribbonY);
        float ribbonGlow = smoothstep(0.12, 0.0, ribbonDist);
        col += harvestGold * ribbonGlow * 0.22;

        // Subtle left-side scrim to protect user avatar and username contrast
        float leftScrim = smoothstep(-1.25, 0.15, uv.x);
        col *= mix(0.72, 1.0, leftScrim);

        // Vignette at outer canvas bounds
        col *= (1.0 - smoothstep(1.0, 2.0, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface TurkeyGobblerBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function TurkeyGobblerBanner({ isStatic = false, ...props }: TurkeyGobblerBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        let renderer: Renderer;
        try {
            renderer = new Renderer({ alpha: true, depth: false });
        } catch (e) {
            console.error("WebGL initialization error in TurkeyGobblerBanner:", e);
            return;
        }

        const gl = renderer.gl;

        const resize = () => {
            if (!ctn.offsetWidth || !ctn.offsetHeight) return;
            renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
            if (program) {
                program.uniforms.uResolution.value.set(
                    gl.canvas.width,
                    gl.canvas.height,
                    gl.canvas.width / (gl.canvas.height || 1)
                );
            }
        };
        window.addEventListener("resize", resize, false);

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: gobblerVert,
            fragment: gobblerFrag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / (gl.canvas.height || 1)) },
            },
            transparent: true,
        });

        resize();

        const mesh = new Mesh(gl, { geometry, program });
        let animateId: number;

        if (isStatic) {
            program.uniforms.uTime.value = 5.2;
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
            window.removeEventListener("resize", resize);
            if (gl.canvas && gl.canvas.parentNode === ctn) {
                ctn.removeChild(gl.canvas);
            }
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "8px", overflow: "hidden" }} {...props}>
            <div ref={ctnDom} className="uvc__container" />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "14%", pointerEvents: "none" }}>
                {/* 1st Annual Turkey Day Gobbler Pick 'Em Champion Crest */}
                <svg width="104" height="104" viewBox="0 0 120 120" fill="none" style={{ filter: "drop-shadow(0px 0px 20px rgba(255, 178, 44, 0.8))" }}>
                    <defs>
                        {/* Radiant 24K Championship Gold */}
                        <linearGradient id="gobblerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF1B0" />
                            <stop offset="40%" stopColor="#FFC83B" />
                            <stop offset="80%" stopColor="#D98A16" />
                            <stop offset="100%" stopColor="#8C4E03" />
                        </linearGradient>

                        {/* Autumn Copper & Roast Mahogany */}
                        <linearGradient id="gobblerFeather" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF7A18" />
                            <stop offset="50%" stopColor="#BF360C" />
                            <stop offset="100%" stopColor="#5D1503" />
                        </linearGradient>

                        {/* Cranberry Snood / Wattle Ruby Glow */}
                        <linearGradient id="gobblerRuby" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF416C" />
                            <stop offset="100%" stopColor="#8A0822" />
                        </linearGradient>

                        {/* Deep Roasted Obsidian Shield Core */}
                        <linearGradient id="gobblerObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2A160E" />
                            <stop offset="100%" stopColor="#120804" />
                        </linearGradient>
                    </defs>

                    {/* Outer Majestic Turkey Tail Fan Plumes */}
                    {/* Plume 1 (Far Left) */}
                    <path d="M60 62 L20 40 C17 32 23 20 33 22 L60 56 Z" fill="url(#gobblerFeather)" stroke="#FFC83B" strokeWidth="0.8" />
                    {/* Plume 2 (Mid Left) */}
                    <path d="M60 62 L32 24 C34 16 44 10 52 16 L60 56 Z" fill="url(#gobblerGold)" stroke="#FFF1B0" strokeWidth="0.8" />
                    {/* Plume 3 (Center Apex Fan) */}
                    <path d="M60 62 L52 14 C55 6 65 6 68 14 L60 56 Z" fill="url(#gobblerFeather)" stroke="#FFC83B" strokeWidth="1" />
                    {/* Plume 4 (Mid Right) */}
                    <path d="M60 62 L68 16 C76 10 86 16 88 24 L60 56 Z" fill="url(#gobblerGold)" stroke="#FFF1B0" strokeWidth="0.8" />
                    {/* Plume 5 (Far Right) */}
                    <path d="M60 62 L87 22 C97 20 103 32 100 40 L60 56 Z" fill="url(#gobblerFeather)" stroke="#FFC83B" strokeWidth="0.8" />

                    {/* Outer Chiseled Championship Shield */}
                    <path d="M60 26 L94 40 L84 94 L60 110 L36 94 L26 40 Z" fill="url(#gobblerObsidian)" stroke="url(#gobblerGold)" strokeWidth="2.2" />

                    {/* Inner Inset Crest Border */}
                    <path d="M60 32 L88 44 L80 89 L60 102 L40 89 L32 44 Z" fill="none" stroke="#FFC83B" strokeWidth="1" opacity="0.65" strokeDasharray="3 2" />

                    {/* Proud Regal Turkey Head / Crest Silhouette */}
                    {/* Head / Neck */}
                    <path d="M54 44 C54 36 66 36 66 44 C66 49 63 52 64 57 C65 62 70 66 69 72 C68 76 64 80 60 80 C56 80 52 76 51 72 C50 66 55 62 56 57 C57 52 54 49 54 44 Z" fill="url(#gobblerGold)" />

                    {/* Sharp Golden Beak */}
                    <polygon points="65,45 74,48 65,51" fill="#FFF1B0" stroke="#8C4E03" strokeWidth="0.6" />

                    {/* Flowing Cranberry Red Wattle / Snood */}
                    <path d="M65 47 C70 47 72 52 71 58 C70 63 66 66 64 68 C62 67 63 62 64 58 C65 54 62 50 65 47 Z" fill="url(#gobblerRuby)" stroke="#FFF1B0" strokeWidth="0.5" />

                    {/* Turkey Eye - Piercing Determined Champion Gaze */}
                    <circle cx="61" cy="42" r="1.8" fill="#120804" />
                    <circle cx="61.4" cy="41.6" r="0.6" fill="#FFFFFF" />

                    {/* 1st Place Champion Crown on Turkey's Head */}
                    <path d="M55 35 L57 30 L60 33 L63 30 L65 35 Z" fill="url(#gobblerGold)" stroke="#FFF1B0" strokeWidth="0.8" />

                    {/* Crossed Golden Football & Wishbone at Bottom of Crest */}
                    {/* Golden Football */}
                    <ellipse cx="60" cy="88" rx="14" ry="8" fill="url(#gobblerFeather)" stroke="url(#gobblerGold)" strokeWidth="1.2" transform="rotate(-15 60 88)" />
                    {/* Football Laces */}
                    <line x1="53" y1="88" x2="67" y2="84.5" stroke="#FFF1B0" strokeWidth="1.2" />
                    <line x1="56" y1="85" x2="55.5" y2="88" stroke="#FFF1B0" strokeWidth="0.8" />
                    <line x1="60" y1="84" x2="59.5" y2="87" stroke="#FFF1B0" strokeWidth="0.8" />
                    <line x1="64" y1="83" x2="63.5" y2="86" stroke="#FFF1B0" strokeWidth="0.8" />

                    {/* Star Accents */}
                    <polygon points="46,62 48,66 52,66 49,69 50,73 46,70 42,73 43,69 40,66 44,66" fill="url(#gobblerGold)" />
                    <polygon points="74,62 76,66 80,66 77,69 78,73 74,70 70,73 71,69 68,66 72,66" fill="url(#gobblerGold)" />
                </svg>
            </div>
        </div>
    );
}
