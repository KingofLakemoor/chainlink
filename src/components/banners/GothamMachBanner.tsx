import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const jetsVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const jetsFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(19.37, 71.93))) * 43758.5453);
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

        // Stealth Gotham Obsidian to Deep Flight Deck Green Background
        vec3 bgAbyss = vec3(0.008, 0.02, 0.012);
        vec3 bgStealth = vec3(0.025, 0.075, 0.038);
        vec3 col = mix(bgAbyss, bgStealth, vUv.y * 0.7 + 0.3 * sin(uv.x * 0.9));

        // High-velocity Supersonic Vapor Slipstreams (Horizontal cutting shear)
        vec2 slipUv = uv;
        slipUv.x += uTime * 3.8 + slipUv.y * 0.25;
        slipUv.y *= 14.0;
        float streamNoise = noise(slipUv) * smoothstep(0.45, 0.95, sin(slipUv.y + uTime * 4.0));
        vec3 aeroWhite = vec3(0.88, 0.98, 0.92);
        col += aeroWhite * streamNoise * 0.16;

        // Dual Supersonic Afterburner Jets with Mach Diamonds
        // Two horizontal thrust vectors at y = -0.12 and y = 0.12
        for (float j = -1.0; j <= 1.0; j += 2.0) {
            float yPos = j * 0.15;
            float dy = abs(uv.y - yPos);
            float beam = smoothstep(0.08, 0.0, dy);

            // Along the jet thrust vector (propagating left to right)
            float thrustCoord = uv.x + uTime * 2.2;
            
            // Mach diamond shock-pattern pulses
            float shockDiamond = sin(thrustCoord * 14.0) * 0.5 + 0.5;
            shockDiamond = pow(shockDiamond, 3.0);

            vec3 coreGreen = vec3(0.0, 0.95, 0.45);
            vec3 darkGreen = vec3(0.0, 0.45, 0.18);
            vec3 neonWhite = vec3(0.85, 1.0, 0.9);

            float spanFade = smoothstep(-1.8, 0.4, uv.x) * smoothstep(1.8, -0.2, uv.x);
            vec3 jetColor = mix(darkGreen, coreGreen, shockDiamond);
            jetColor = mix(jetColor, neonWhite, shockDiamond * smoothstep(0.025, 0.0, dy));

            col += jetColor * beam * spanFade * 1.35;
        }

        // Radar/HUD telemetry grid particles drifting in the vortex
        vec2 particleUv = uv;
        particleUv.x -= uTime * 1.8;
        particleUv.y += sin(uTime * 1.5 + uv.x * 2.0) * 0.1;
        vec2 grid = vec2(30.0, 16.0);
        vec2 id = floor(particleUv * grid);
        vec2 st = fract(particleUv * grid) - 0.5;
        float isSpark = step(0.95, hash(id));
        float pGlow = 0.007 / (length(st) + 0.003) * isSpark;
        col += vec3(0.1, 1.0, 0.5) * pGlow * 0.55;

        // Subtle left-side vignette scrim for username/avatar legibility
        float leftScrim = smoothstep(-1.2, 0.2, uv.x);
        col *= mix(0.68, 1.0, leftScrim);

        // Edge vignette
        col *= (1.0 - smoothstep(0.9, 1.9, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export interface GothamMachBannerProps {
    isStatic?: boolean;
    className?: string;
    [key: string]: any;
}

export function GothamMachBanner({ isStatic = false, ...props }: GothamMachBannerProps) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        let renderer: Renderer;
        try {
            renderer = new Renderer({ alpha: true, depth: false });
        } catch (e) {
            console.error("WebGL initialization error in GothamMachBanner:", e);
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
            vertex: jetsVert,
            fragment: jetsFrag,
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
            program.uniforms.uTime.value = 6.4;
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
                {/* Forged Gotham Mach Supersonic Turbine Crest */}
                <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 18px rgba(0, 255, 119, 0.75))" }}>
                    <defs>
                        <linearGradient id="jetsGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#45F28B" />
                            <stop offset="45%" stopColor="#00843D" />
                            <stop offset="100%" stopColor="#003D1B" />
                        </linearGradient>
                        <linearGradient id="jetsWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="60%" stopColor="#D8EAD9" />
                            <stop offset="100%" stopColor="#7DA884" />
                        </linearGradient>
                        <linearGradient id="jetsObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#121D16" />
                            <stop offset="100%" stopColor="#040905" />
                        </linearGradient>
                    </defs>

                    {/* Outer Chiseled Supersonic Delta Wing Shield */}
                    <path d="M50 8 L90 30 L76 84 L50 96 L24 84 L10 30 Z" fill="url(#jetsGreenGrad)" stroke="#45F28B" strokeWidth="1.5" />
                    {/* Inner Stealth Cockpit Core */}
                    <path d="M50 16 L82 34 L70 78 L50 88 L30 78 L18 34 Z" fill="url(#jetsObsidian)" />

                    {/* Swept-back Mach Delta Jet Silhouette & Spearhead */}
                    {/* Main Supersonic Jet Body */}
                    <path d="M50 20 L55 42 L66 54 L84 62 L74 65 L55 60 L50 78 L45 60 L26 65 L16 62 L34 54 L45 42 Z" fill="url(#jetsWhiteGrad)" />
                    {/* Twin Afterburner Flame Vanes */}
                    <polygon points="48,78 50,86 52,78 50,75" fill="#45F28B" style={{ filter: "drop-shadow(0px 0px 4px #45F28B)" }} />
                    <polygon points="44,66 40,74 46,70" fill="url(#jetsGreenGrad)" />
                    <polygon points="56,66 60,74 54,70" fill="url(#jetsGreenGrad)" />
                    {/* Cockpit Canopy */}
                    <polygon points="50,28 53,40 50,44 47,40" fill="url(#jetsGreenGrad)" stroke="#FFFFFF" strokeWidth="0.8" />
                </svg>
            </div>
        </div>
    );
}
