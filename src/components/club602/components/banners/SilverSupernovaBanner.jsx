"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const supernovaVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const supernovaFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // Deep Metallic Navy Background
        vec3 bgDark = vec3(0.01, 0.05, 0.12);
        vec3 bgNavy = vec3(0.05, 0.15, 0.35);
        vec3 col = mix(bgNavy, bgDark, length(uv) * 1.1);

        // Rotating Radial Rays (Abstract Spur/Starburst)
        vec2 rUv = uv * rot(uTime * 0.15);
        float angle = atan(rUv.y, rUv.x);
        // 10-point radial burst
        float rays = max(0.0, sin(angle * 10.0) * 0.5 + 0.5);
        float rayGlow = smoothstep(0.8, 1.0, rays) * (0.25 / length(uv));
        col += vec3(0.75, 0.85, 0.95) * rayGlow * 0.15;

        // Sharp metallic glints (Stadium strobe effect)
        vec2 aUv = abs(uv * rot(-uTime * 0.3));
        float glint = 0.003 / (aUv.x * aUv.y + 0.0005);
        float strobe = 0.5 + 0.5 * sin(uTime * 4.0);
        col += vec3(0.9, 0.95, 1.0) * glint * smoothstep(1.5, 0.0, length(uv)) * (0.6 + 0.4 * strobe);

        // Core silver glow
        float core = 0.1 / (length(uv) + 0.01);
        col += vec3(0.8, 0.9, 1.0) * core * 0.4;

        // Vignette
        col *= smoothstep(1.8, 0.3, length(uv));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function SilverSupernovaBanner({ isStatic = false, ...props }) {
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
            vertex: supernovaVert,
            fragment: supernovaFrag,
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
            program.uniforms.uTime.value = 5.2; // Perfectly locks the strobe and glint on screen
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
                {/* Hyper-Polished Chrome Link */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 10px rgba(255, 255, 255, 0.5))" }}>
                    <defs>
                        <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="20%" stopColor="#8795A1" />
                            <stop offset="40%" stopColor="#FFFFFF" />
                            <stop offset="50%" stopColor="#3D4852" />
                            <stop offset="60%" stopColor="#B8C2CC" />
                            <stop offset="80%" stopColor="#F1F5F8" />
                            <stop offset="100%" stopColor="#606F7B" />
                        </linearGradient>
                    </defs>
                    <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="url(#chromeGradient)" />
                    <path d="M50 20 L75 35 L75 65 L50 80 L25 65 L25 35 Z" fill="#041E42" />
                    <circle cx="50" cy="50" r="10" fill="url(#chromeGradient)" />
                </svg>
            </div>
        </div>
    );
}
