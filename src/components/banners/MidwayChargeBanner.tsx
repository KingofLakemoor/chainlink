import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const midwayVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const midwayFrag = `
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

        // Deep Soldier Field Midnight Navy to Frozen Abyss Background
        vec3 bgAbyss = vec3(0.008, 0.015, 0.035);
        vec3 bgNavy = vec3(0.043, 0.086, 0.165);
        vec3 col = mix(bgAbyss, bgNavy, vUv.y * 0.7 + 0.3 * sin(uv.x * 0.8));

        // Horizontal Lakefront Blizzard Wind Streaks (Lake Michigan Gale)
        vec2 windUv = uv;
        windUv.x += uTime * 2.8 + windUv.y * 0.4;
        windUv.y *= 12.0;
        float windGust = noise(windUv) * smoothstep(0.4, 0.9, sin(windUv.y + uTime * 3.0));
        vec3 frostWhite = vec3(0.85, 0.92, 1.0);
        col += frostWhite * windGust * 0.18;

        // Roaring Burnt-Orange Beast Claw Slashes (Chicago Energy)
        // 3 diagonal predatory slash vectors through the center
        for (float i = -1.0; i <= 1.0; i += 1.0) {
            float xOffset = i * 0.35 + 0.1 * sin(uTime * 2.5 + i);
            float slashCoord = (uv.x - xOffset) * 0.707 + (uv.y - 0.05) * 0.707;
            float slashDist = abs(slashCoord);
            float slashLine = smoothstep(0.05, 0.0, slashDist);

            // Along-the-slash segment limiter
            float slashSpan = (uv.x - xOffset) * (-0.707) + (uv.y - 0.05) * 0.707;
            float spanMask = smoothstep(0.75, 0.2, abs(slashSpan));

            // Searing pulse along slash
            float pulse = 0.5 + 0.5 * sin(uTime * 5.0 - slashSpan * 6.0 + i * 1.5);
            vec3 burntOrange = vec3(0.92, 0.32, 0.02);
            vec3 neonOrange = vec3(1.0, 0.55, 0.1);
            vec3 slashCol = mix(burntOrange, neonOrange, pulse);

            col += slashCol * slashLine * spanMask * (1.2 + 0.6 * pulse);
        }

        // Frost particle drifting snow crystals
        vec2 snowUv = uv;
        snowUv.x += uTime * 1.6;
        snowUv.y -= uTime * 0.5;
        vec2 grid = vec2(32.0, 16.0);
        vec2 id = floor(snowUv * grid);
        vec2 st = fract(snowUv * grid) - 0.5;
        float isFlake = step(0.95, hash(id));
        float flakeGlow = 0.008 / (length(st) + 0.004) * isFlake;
        col += frostWhite * flakeGlow * 0.45;

        // Subtle left-side vignette scrim for username/avatar legibility
        float leftScrim = smoothstep(-1.2, 0.2, uv.x);
        col *= mix(0.65, 1.0, leftScrim);

        // Edge vignette
        col *= (1.0 - smoothstep(1.0, 2.0, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface MidwayChargeBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function MidwayChargeBanner({ isStatic = false, ...props }: MidwayChargeBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        let renderer: Renderer;
        try {
            renderer = new Renderer({ alpha: true, depth: false });
        } catch (e) {
            console.error("WebGL initialization error in MidwayChargeBanner:", e);
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
            vertex: midwayVert,
            fragment: midwayFrag,
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
            program.uniforms.uTime.value = 8.5;
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
                {/* Forged Chicago Midway Bear Crest */}
                <svg width="88" height="88" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 16px rgba(200, 56, 3, 0.75))" }}>
                    <defs>
                        <linearGradient id="chicagoOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFA24C" />
                            <stop offset="50%" stopColor="#C83803" />
                            <stop offset="100%" stopColor="#8C2400" />
                        </linearGradient>
                        <linearGradient id="chicagoNavy" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1B365D" />
                            <stop offset="100%" stopColor="#0B162A" />
                        </linearGradient>
                    </defs>

                    {/* Outer Chiseled Shield */}
                    <path d="M50 8 L86 24 L78 78 L50 94 L22 78 L14 24 Z" fill="url(#chicagoOrange)" stroke="#FFA24C" strokeWidth="1.5" />
                    {/* Inner Deep Navy Core */}
                    <path d="M50 16 L78 28 L72 72 L50 85 L28 72 L22 28 Z" fill="url(#chicagoNavy)" />

                    {/* Stylized Geometric Roaring Bear Head / Claw Geometry */}
                    {/* Snout and Brow */}
                    <path d="M35 34 L50 42 L65 34 L72 46 L62 50 L66 62 L50 56 L34 62 L38 50 L28 46 Z" fill="url(#chicagoOrange)" />
                    {/* Fang & Jaw Details */}
                    <path d="M42 58 L46 68 L50 62 L54 68 L58 58 Z" fill="#FFFFFF" />
                    {/* Eyes */}
                    <polygon points="40,42 45,44 41,47" fill="#FFFFFF" style={{ filter: "drop-shadow(0px 0px 4px #FFFFFF)" }} />
                    <polygon points="60,42 55,44 59,47" fill="#FFFFFF" style={{ filter: "drop-shadow(0px 0px 4px #FFFFFF)" }} />
                </svg>
            </div>
        </div>
    );
}
