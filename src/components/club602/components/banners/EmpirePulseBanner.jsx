"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const pulseVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const pulseFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    // Fast pseudo-random generator
    float hash(float n) {
        return fract(sin(n) * 43758.5453123);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // Big Blue Base
        vec3 baseBlue = vec3(0.02, 0.05, 0.15);
        vec3 gridBlue = vec3(0.1, 0.25, 0.6);
        vec3 col = baseBlue;

        // The City Grid
        vec2 st = uv * 6.0;
        vec2 grid = fract(st);
        vec2 cell = floor(st);

        float lineThickness = 0.08;
        float lines = smoothstep(1.0 - lineThickness, 1.0, grid.x) + smoothstep(1.0 - lineThickness, 1.0, grid.y);
        col = mix(col, gridBlue, clamp(lines, 0.0, 1.0) * 0.4);

        // Crimson and White Traffic Streaks
        vec3 crimson = vec3(0.85, 0.05, 0.15);
        vec3 white = vec3(0.95, 0.95, 1.0);

        // Horizontal Traffic
        float speedH = (hash(cell.y) * 2.0 + 1.0) * sign(hash(cell.y + 10.0) - 0.5);
        float pulseH = smoothstep(0.9, 1.0, fract(st.x * 0.5 - uTime * speedH));
        // Randomly disable traffic on some horizontal streets
        float isRoadH = smoothstep(1.0 - lineThickness, 1.0, grid.y) * step(0.3, hash(cell.y * 12.3));

        // Vertical Traffic
        float speedV = (hash(cell.x) * 2.0 + 1.0) * sign(hash(cell.x + 20.0) - 0.5);
        float pulseV = smoothstep(0.9, 1.0, fract(st.y * 0.5 - uTime * speedV));
        // Randomly disable traffic on some vertical avenues
        float isRoadV = smoothstep(1.0 - lineThickness, 1.0, grid.x) * step(0.3, hash(cell.x * 32.1));

        // Assign colors randomly to the streaks
        vec3 pulseColorH = mix(crimson, white, step(0.5, hash(cell.y * 7.7)));
        vec3 pulseColorV = mix(crimson, white, step(0.5, hash(cell.x * 9.9)));

        // Add traffic to canvas with a bright bloom multiplier
        col += pulseColorH * pulseH * isRoadH * 2.5;
        col += pulseColorV * pulseV * isRoadV * 2.5;

        // Depth Vignette
        col *= smoothstep(2.2, 0.6, length(uv));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function EmpirePulseBanner({ isStatic = false, ...props }) {
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
            vertex: pulseVert,
            fragment: pulseFrag,
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
            program.uniforms.uTime.value = 18.5; // Captures a dense intersection of traffic streaks
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
                {/* Neon Subway/Diner Sign Link */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
                    <rect x="25" y="25" width="50" height="50" rx="10" stroke="#0B2265" strokeWidth="8" />
                    <rect x="25" y="25" width="50" height="50" rx="10" stroke="#E31837" strokeWidth="3" style={{ filter: "drop-shadow(0px 0px 8px #E31837)" }} />
                    <path d="M40 50 L60 50 M50 40 L50 60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" style={{ filter: "drop-shadow(0px 0px 6px #FFFFFF)" }} />
                </svg>
            </div>
        </div>
    );
}
