import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const crescentVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const crescentFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(37.19, 93.41))) * 43758.5453);
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

        // Deep Obsidian Black Velvet to Midnight Charcoal
        vec3 bgObsidian = vec3(0.015, 0.015, 0.02);
        vec3 bgVelvet = vec3(0.045, 0.04, 0.05);
        vec3 col = mix(bgObsidian, bgVelvet, vUv.y * 0.8 + 0.2 * noise(uv * 1.5 + uTime * 0.1));

        // Warm French Quarter Gaslight / Bourbon Street Halos
        vec2 center = vec2(0.0, 0.0);
        float distCenter = length(uv - center);
        float gaslight = 0.35 / (distCenter * 1.8 + 0.4);
        vec3 oldGold = vec3(0.85, 0.74, 0.52);
        vec3 richAmber = vec3(1.0, 0.82, 0.28);
        col += mix(oldGold, richAmber, 0.5 + 0.5 * sin(uTime * 1.5)) * gaslight * 0.45;

        // Concentric Cathedral Rose / Filigree Arches pulsing gently
        for (float r = 0.3; r <= 1.5; r += 0.3) {
            float ringDist = abs(distCenter - r - 0.04 * sin(uTime * 1.2 + r * 2.0));
            float ringLine = smoothstep(0.015, 0.0, ringDist);
            float ringPulse = 0.5 + 0.5 * sin(uTime * 3.0 - r * 4.0);
            col += oldGold * ringLine * ringPulse * 0.35;
        }

        // Drifting Brass Jazz Sparks & Golden Mardi Gras Embers (Ascending gently)
        vec2 sparkUv = uv;
        sparkUv.y += uTime * 0.7;
        sparkUv.x += sin(uTime * 1.2 + uv.y * 3.0) * 0.15;
        vec2 grid = vec2(28.0, 18.0);
        vec2 id = floor(sparkUv * grid);
        vec2 st = fract(sparkUv * grid) - 0.5;

        float isSpark = step(0.93, hash(id));
        float sparkGlow = 0.01 / (length(st) + 0.005) * isSpark;
        float sparkFade = smoothstep(-1.2, 0.8, uv.y);
        float flicker = 0.5 + 0.5 * sin(uTime * 8.0 + hash(id) * 30.0);
        col += richAmber * sparkGlow * sparkFade * flicker * 0.85;

        // Subtle left-side vignette scrim for username/avatar legibility
        float leftScrim = smoothstep(-1.2, 0.2, uv.x);
        col *= mix(0.7, 1.0, leftScrim);

        // Edge vignette
        col *= (1.0 - smoothstep(0.8, 1.8, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface CrescentCrownBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function CrescentCrownBanner({ isStatic = false, ...props }: CrescentCrownBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        let renderer: Renderer;
        try {
            renderer = new Renderer({ alpha: true, depth: false });
        } catch (e) {
            console.error("WebGL initialization error in CrescentCrownBanner:", e);
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
            vertex: crescentVert,
            fragment: crescentFrag,
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
            program.uniforms.uTime.value = 6.2;
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
                {/* Forged New Orleans Royal Fleur-de-lis Crest */}
                <svg width="88" height="88" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 18px rgba(211, 188, 141, 0.85))" }}>
                    <defs>
                        <linearGradient id="saintsGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF3D1" />
                            <stop offset="35%" stopColor="#D3BC8D" />
                            <stop offset="70%" stopColor="#C2A468" />
                            <stop offset="100%" stopColor="#8C6E33" />
                        </linearGradient>
                        <linearGradient id="saintsObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#252528" />
                            <stop offset="100%" stopColor="#0B0B0D" />
                        </linearGradient>
                    </defs>

                    {/* Outer Diamond / Crown Shield */}
                    <path d="M50 6 L88 32 L78 84 L50 96 L22 84 L12 32 Z" fill="url(#saintsGold)" stroke="#FFF3D1" strokeWidth="1.5" />
                    {/* Inner Obsidian Velvet Core */}
                    <path d="M50 14 L80 36 L72 78 L50 88 L28 78 L20 36 Z" fill="url(#saintsObsidian)" />

                    {/* Classic Forged Fleur-de-lis Geometry */}
                    {/* Center Spear Petal */}
                    <path d="M50 24 C54 36 58 48 50 62 C42 48 46 36 50 24 Z" fill="url(#saintsGold)" />
                    {/* Left Petal */}
                    <path d="M48 48 C42 42 32 38 28 44 C24 50 28 56 36 56 C44 56 46 54 48 50 Z" fill="url(#saintsGold)" />
                    {/* Right Petal */}
                    <path d="M52 48 C58 42 68 38 72 44 C76 50 72 56 64 56 C56 56 54 54 52 50 Z" fill="url(#saintsGold)" />
                    {/* Crossbar Band */}
                    <rect x="34" y="58" width="32" height="6" rx="2" fill="url(#saintsGold)" stroke="#FFF3D1" strokeWidth="1" />
                    {/* Bottom Base */}
                    <path d="M44 64 L50 74 L56 64 Z" fill="url(#saintsGold)" />
                </svg>
            </div>
        </div>
    );
}
