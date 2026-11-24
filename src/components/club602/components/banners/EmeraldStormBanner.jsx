"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const emeraldVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const emeraldFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        vec3 bgNavy = vec3(0.01, 0.05, 0.11);
        vec3 bgAbyss = vec3(0.0, 0.02, 0.05);
        vec3 col = mix(bgAbyss, bgNavy, vUv.y);

        vec2 rainUv = uv;
        rainUv.x += rainUv.y * 0.25;
        rainUv.y += uTime * 3.5;

        vec2 grid = vec2(35.0, 4.0);
        vec2 id = floor(rainUv * grid);
        vec2 st = fract(rainUv * grid);

        float drop = step(0.96, hash(id)) * smoothstep(0.0, 0.9, st.y) * step(st.x, 0.12);
        vec3 rainColor = vec3(0.65, 0.78, 0.88) * drop * 0.45;
        col += rainColor;

        float bottomImpact = smoothstep(-0.6, -1.0, uv.y);
        float shockPulse = sin(uTime * 4.0 + uv.x * 6.0) * 0.5 + 0.5;
        vec3 actionGreen = vec3(0.22, 1.0, 0.08);
        col += actionGreen * bottomImpact * (0.35 + 0.45 * shockPulse);

        float distCenter = length(uv - vec2(0.0, 0.0));
        float soundWave = sin(distCenter * 14.0 - uTime * 5.0);
        soundWave = smoothstep(0.92, 1.0, soundWave) * smoothstep(1.2, 0.0, distCenter);
        col += actionGreen * soundWave * 0.25;

        col *= (1.0 - smoothstep(0.6, 1.4, length(uv)));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function EmeraldStormBanner({ isStatic = false, ...props }) {
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
            vertex: emeraldVert,
            fragment: emeraldFrag,
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
            program.uniforms.uTime.value = 3.0;
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
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 10px rgba(57, 255, 20, 0.75))" }}>
                    <defs>
                        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#A8FF78" />
                            <stop offset="50%" stopColor="#39FF14" />
                            <stop offset="100%" stopColor="#0B5345" />
                        </linearGradient>
                        <linearGradient id="metalWing" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#85929E" />
                            <stop offset="100%" stopColor="#2C3E50" />
                        </linearGradient>
                    </defs>
                    <path d="M12 42 L34 48 L22 62 Z" fill="url(#metalWing)" opacity="0.85" />
                    <path d="M88 42 L66 48 L78 62 Z" fill="url(#metalWing)" opacity="0.85" />
                    <rect x="36" y="32" width="28" height="36" rx="14" stroke="url(#emeraldGrad)" strokeWidth="5" />
                    <circle cx="50" cy="50" r="4" fill="#39FF14" />
                </svg>
            </div>
        </div>
    );
}
