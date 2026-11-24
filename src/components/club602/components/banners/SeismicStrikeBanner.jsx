"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const seismicVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const seismicFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    // Fast pseudo-random hash
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // 2D Noise function for fog and geological texture
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 4; ++i) {
            v += a * noise(p);
            p = rot * p * 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // San Francisco Bay / Pacific Deep Navy Ocean Base
        vec3 deepNavy = vec3(0.01, 0.03, 0.10);
        vec3 bayNavy = vec3(0.02, 0.08, 0.20);
        vec3 col = mix(deepNavy, bayNavy, vUv.y * 0.6 + 0.4);

        // Rolling San Francisco Bay Fog Layer
        vec2 fogUv = uv * vec2(1.2, 2.5);
        fogUv.x += uTime * 0.15; // Slow drift across the bay
        float fog = fbm(fogUv + vec2(0.0, uTime * 0.05));
        vec3 fogColor = vec3(0.45, 0.55, 0.65) * 0.25 * smoothstep(0.2, 0.8, fog);
        col += fogColor;

        // Seismic Fault Line (San Andreas inspired rift)
        float faultPath = sin(uv.x * 2.5 + 1.2) * 0.25 + sin(uv.x * 7.0) * 0.08;
        float distToFault = abs(uv.y - faultPath);

        // Fault line tension glow in International Orange
        vec3 intlOrange = vec3(0.94, 0.29, 0.14);
        vec3 goldEnergy = vec3(1.0, 0.72, 0.12);

        float faultLine = 0.012 / (distToFault + 0.008);
        col += mix(intlOrange, goldEnergy, 0.3) * faultLine * 0.6;

        // Seismic Shockwave Pulses propagating from epicenter
        vec2 epicenter = vec2(-0.3, 0.0);
        float distEpicenter = length(uv - epicenter);

        // Concentric shockwaves
        float wave = sin(distEpicenter * 16.0 - uTime * 4.5);
        float wavePulse = smoothstep(0.88, 1.0, wave) * smoothstep(1.5, 0.0, distEpicenter);

        // Expanding seismic pulse bursts
        float pulseSpeed = fract(uTime * 0.4);
        float shockRing = smoothstep(0.05, 0.0, abs(distEpicenter - pulseSpeed * 1.8));
        float fadeRing = (1.0 - pulseSpeed);

        col += intlOrange * wavePulse * 0.5;
        col += goldEnergy * shockRing * fadeRing * 0.8;

        // Vignette
        col *= smoothstep(1.8, 0.5, length(uv));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function SeismicStrikeBanner({ isStatic = false, ...props }) {
    const ctnDom = useRef(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        const renderer = new Renderer({ alpha: true, depth: false });
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
            vertex: seismicVert,
            fragment: seismicFrag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / (gl.canvas.height || 1)) },
            },
            transparent: true,
        });

        resize();

        const mesh = new Mesh(gl, { geometry, program });
        let animateId;

        if (isStatic) {
            program.uniforms.uTime.value = 6.2; // Captures peak fault tension and shockwave alignment
            if (mounted) renderer.render({ scene: mesh });
        } else {
            const update = (t) => {
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
                {/* Golden Gate / San Francisco Suspension Bridge Link Icon */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 10px rgba(240, 74, 36, 0.75))" }}>
                    <defs>
                        <linearGradient id="ggOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF6B4A" />
                            <stop offset="50%" stopColor="#F04A24" />
                            <stop offset="100%" stopColor="#8A1A00" />
                        </linearGradient>
                        <linearGradient id="ggGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFE066" />
                            <stop offset="100%" stopColor="#FFB800" />
                        </linearGradient>
                    </defs>
                    {/* Bridge Towers */}
                    <rect x="22" y="20" width="8" height="60" rx="2" fill="url(#ggOrange)" />
                    <rect x="70" y="20" width="8" height="60" rx="2" fill="url(#ggOrange)" />
                    {/* Tower Cross Bracing */}
                    <path d="M22 35 L30 45 M30 35 L22 45 M22 55 L30 65 M30 55 L22 65" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
                    <path d="M70 35 L78 45 M78 35 L70 45 M70 55 L78 65 M78 55 L70 65" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
                    {/* Suspension Cable Arc */}
                    <path d="M10 25 Q50 65 90 25" stroke="url(#ggOrange)" strokeWidth="4" fill="none" />
                    {/* Golden Center Chain Link */}
                    <rect x="38" y="42" width="24" height="16" rx="8" stroke="url(#ggGold)" strokeWidth="4" fill="none" style={{ filter: "drop-shadow(0px 0px 6px #FFB800)" }} />
                </svg>
            </div>
        </div>
    );
}
