"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const alpineVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const alpineFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    // 1D Fractal Noise for Mountain Ridge
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        float u = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), u);
    }
    float fbm(float x) {
        float v = 0.0;
        float a = 0.5;
        float shift = float(100.0);
        for (int i = 0; i < 4; ++i) {
            v += a * noise(x);
            x = x * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // High Altitude Navy Sky
        vec3 skyDark = vec3(0.01, 0.03, 0.1);
        vec3 skyLight = vec3(0.04, 0.12, 0.28);
        vec3 col = mix(skyDark, skyLight, uv.y * 0.5 + 0.5);

        // High-Speed Wind/Blizzard Streaks
        float windSpeed = uTime * 2.5;
        float windStreak = smoothstep(0.97, 1.0, fract(sin(uv.y * 40.0) * 43758.5453 - windSpeed));
        col += vec3(0.8, 0.9, 1.0) * windStreak * 0.15;

        // Mountain Ridge Generation
        // uTime offsets the X coordinate to simulate flying over the peaks
        float mntHeight = fbm(uv.x * 2.0 + uTime * 0.4) * 0.8 - 0.5;
        float isMnt = step(uv.y, mntHeight);

        // Mountain Body (Dark Navy/Black silhouette)
        col = mix(col, vec3(0.0, 0.01, 0.05), isMnt);

        // Glowing "Mile High" Orange Edge along the ridge
        float edgeDist = abs(uv.y - mntHeight);
        float orangeGlow = 0.015 / (edgeDist + 0.005);
        vec3 orange = vec3(1.0, 0.35, 0.0);
        col += orange * orangeGlow * (1.0 - isMnt);

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function AlpineSurgeBanner({ isStatic = false, ...props }) {
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
            vertex: alpineVert,
            fragment: alpineFrag,
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
            program.uniforms.uTime.value = 8.5; // Captures a great peak and wind streak alignment
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
                {/* Sharp, Frosted Ice Link Icon */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 10px rgba(255, 255, 255, 0.5))" }}>
                    <defs>
                        <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="50%" stopColor="#A0C4FF" />
                            <stop offset="100%" stopColor="#041E42" />
                        </linearGradient>
                    </defs>
                    <path d="M50 15 L80 35 L50 90 L20 35 Z" fill="url(#iceGrad)" opacity="0.9" />
                    <path d="M50 25 L65 38 L50 75 L35 38 Z" fill="#FB4F14" />
                </svg>
            </div>
        </div>
    );
}
