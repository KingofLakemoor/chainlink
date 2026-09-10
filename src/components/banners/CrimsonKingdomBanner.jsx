"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const crimsonVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const crimsonFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(15.23, 78.233))) * 43758.5453);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // Deep Crimson to Charcoal Background
        vec3 bgDark = vec3(0.05, 0.0, 0.0);
        vec3 bgRed = vec3(0.35, 0.0, 0.05);
        vec3 col = mix(bgRed, bgDark, length(uv) * 0.8);

        // The Golden Chevron (Arrowhead motif)
        // Adjust Y to push it down slightly, creating a V shape
        float chevronDist = abs(uv.x) - (uv.y - 0.2) * 1.2;

        // Create multiple pulsing outlines
        float line1 = smoothstep(0.03, 0.0, abs(chevronDist - 0.15));
        float line2 = smoothstep(0.02, 0.0, abs(chevronDist - 0.3));

        // Energy pulse traveling down the chevron
        float pulse = 0.5 + 0.5 * sin(uTime * 4.0 - uv.y * 6.0);
        vec3 gold = vec3(1.0, 0.75, 0.1);

        // Only render the chevron below a certain Y point to complete the V look
        float mask = step(uv.y, 0.6);
        col += gold * line1 * pulse * 1.5 * mask;
        col += gold * line2 * (1.0 - pulse) * 0.8 * mask;

        // Rising Fire Embers
        vec2 emberUv = uv;
        emberUv.y -= uTime * 0.8;
        vec2 grid = vec2(25.0, 20.0);
        vec2 id = floor(emberUv * grid);
        vec2 st = fract(emberUv * grid) - 0.5;

        // Horizontal drift for embers
        st.x += sin(uTime * 2.0 + id.y * 5.0) * 0.25;

        float isEmber = step(0.92, hash(id));
        float emberGlow = 0.01 / (length(st) + 0.005) * isEmber;

        // Embers fade as they reach the top
        float fade = smoothstep(1.0, -1.0, uv.y);
        col += vec3(1.0, 0.5, 0.1) * emberGlow * fade * (0.5 + 0.5 * sin(uTime * 10.0 + hash(id) * 20.0));

        // Stadium Depth Vignette
        col *= smoothstep(2.0, 0.4, length(uv));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function CrimsonKingdomBanner({ isStatic = false, ...props }) {
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
            vertex: crimsonVert,
            fragment: crimsonFrag,
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
            program.uniforms.uTime.value = 12.4;
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
                {/* Forged Gold Shield/Link Icon */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 15px rgba(227, 24, 55, 0.6))" }}>
                    <defs>
                        <linearGradient id="chiefsGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF176" />
                            <stop offset="50%" stopColor="#FFB612" />
                            <stop offset="100%" stopColor="#B37D00" />
                        </linearGradient>
                    </defs>
                    <path d="M50 10 L85 25 L75 80 L50 95 L25 80 L15 25 Z" fill="url(#chiefsGold)" />
                    <path d="M50 20 L75 32 L67 75 L50 85 L33 75 L25 32 Z" fill="#E31837" />
                    <path d="M35 45 L65 45 M50 30 L50 60" stroke="url(#chiefsGold)" strokeWidth="6" strokeLinecap="round" />
                </svg>
            </div>
        </div>
    );
}
