import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const chargersVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const chargersFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(23.41, 87.65))) * 43758.5453);
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

        // Deep Pacific Thunderstorm Midnight Navy Background
        vec3 bgAbyss = vec3(0.005, 0.02, 0.05);
        vec3 bgNavy = vec3(0.015, 0.06, 0.16);
        vec3 col = mix(bgAbyss, bgNavy, vUv.y * 0.75 + 0.25 * sin(uv.x * 0.8));

        // High-voltage undulation wave through the ether (Powder Blue plasma layer)
        float wave = sin(uv.x * 4.0 - uTime * 3.0) * 0.12 + sin(uv.x * 9.0 + uTime * 4.5) * 0.04;
        float waveDist = abs(uv.y - wave);
        float plasmaGlow = 0.04 / (waveDist + 0.035);
        vec3 powderBlue = vec3(0.0, 0.58, 0.95);
        vec3 solarGold = vec3(1.0, 0.76, 0.08);
        col += mix(powderBlue, solarGold, 0.35 + 0.35 * sin(uTime * 3.5 + uv.x * 2.0)) * plasmaGlow * 0.45;

        // Jagged High-Voltage Lightning Discharges
        for (float k = 0.0; k < 3.0; k += 1.0) {
            float phase = uTime * 2.8 + k * 2.1;
            float arcActive = step(0.68, sin(phase * 3.0));

            // Segmented jagged lightning displacement
            float boltY = (k - 1.0) * 0.35 + sin(uv.x * 5.0 + phase) * 0.15;
            boltY += (noise(vec2(uv.x * 12.0, phase * 4.0)) - 0.5) * 0.25;

            float boltDist = abs(uv.y - boltY);
            float boltCore = smoothstep(0.012, 0.0, boltDist);
            float boltHalo = 0.018 / (boltDist + 0.012);

            vec3 arcColor = (k == 1.0) ? solarGold : powderBlue;
            vec3 arcFlash = mix(arcColor, vec3(1.0, 1.0, 1.0), boltCore);

            col += arcFlash * (boltCore * 1.5 + boltHalo * 0.6) * arcActive;
        }

        // Drifting Ionized Sparks & Gold Arc Embers (Tesla field)
        vec2 sparkUv = uv;
        sparkUv.x += sin(uTime * 2.0 + sparkUv.y * 4.0) * 0.15;
        sparkUv.y -= uTime * 0.85;
        vec2 grid = vec2(32.0, 18.0);
        vec2 id = floor(sparkUv * grid);
        vec2 st = fract(sparkUv * grid) - 0.5;

        float isSpark = step(0.94, hash(id));
        float sparkIntensity = 0.008 / (length(st) + 0.003) * isSpark;
        vec3 sparkColor = mix(powderBlue, solarGold, hash(id + vec2(1.0, 2.0)));
        col += sparkColor * sparkIntensity * 0.6;

        // Subtle left-side vignette scrim for username/avatar legibility
        float leftScrim = smoothstep(-1.2, 0.2, uv.x);
        col *= mix(0.7, 1.0, leftScrim);

        // Edge vignette
        col *= (1.0 - smoothstep(0.9, 1.9, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface ArcSurgeBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function ArcSurgeBanner({ isStatic = false, ...props }: ArcSurgeBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        let renderer: Renderer;
        try {
            renderer = new Renderer({ alpha: true, depth: false });
        } catch (e) {
            console.error("WebGL initialization error in ArcSurgeBanner:", e);
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
            vertex: chargersVert,
            fragment: chargersFrag,
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
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                {/* Forged Los Angeles Arc Surge High-Voltage Crest */}
                <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 18px rgba(0, 128, 198, 0.85))" }}>
                    <defs>
                        <linearGradient id="chargersGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF275" />
                            <stop offset="45%" stopColor="#FFC20E" />
                            <stop offset="100%" stopColor="#D99B00" />
                        </linearGradient>
                        <linearGradient id="chargersBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#66C7FF" />
                            <stop offset="50%" stopColor="#0080C6" />
                            <stop offset="100%" stopColor="#004C78" />
                        </linearGradient>
                        <linearGradient id="chargersNavy" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0E2442" />
                            <stop offset="100%" stopColor="#030C18" />
                        </linearGradient>
                    </defs>

                    {/* Outer Chiseled Angular Crest Shield */}
                    <path d="M50 6 L90 28 L80 84 L50 96 L20 84 L10 28 Z" fill="url(#chargersBlueGrad)" stroke="#66C7FF" strokeWidth="1.5" />
                    {/* Inner Deep Navy Core */}
                    <path d="M50 14 L82 32 L74 78 L50 88 L26 78 L18 32 Z" fill="url(#chargersNavy)" />

                    {/* Classic Forged Dual Lightning Bolt Motif */}
                    {/* Primary Lightning Bolt */}
                    <polygon points="56,18 32,52 48,52 38,82 72,44 54,44" fill="url(#chargersGoldGrad)" stroke="#FFF275" strokeWidth="1.2" style={{ filter: "drop-shadow(0px 0px 8px rgba(255, 194, 14, 0.8))" }} />
                    {/* Inner Accent Glow Bolt */}
                    <polygon points="54,26 38,50 48,50 42,72 64,46 52,46" fill="#FFFFFF" opacity="0.6" />
                </svg>
            </div>
        </div>
    );
}
