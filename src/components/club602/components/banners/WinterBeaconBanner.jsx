"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const frostVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const frostFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.23, 289.17))) * 43758.5453);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        vec3 col = mix(vec3(0.01, 0.03, 0.07), vec3(0.03, 0.08, 0.16), vUv.y);

        vec2 lightSource = vec2(0.0, 0.9);
        vec2 lightDir = uv - lightSource;
        float lightAngle = atan(lightDir.y, lightDir.x);

        float sweepAngle = -1.57 + sin(uTime * 0.9) * 0.95;
        float beamSpread = 0.28;
        float inBeam = smoothstep(beamSpread, 0.0, abs(lightAngle - sweepAngle));
        float beamFade = smoothstep(2.2, 0.2, length(lightDir));

        vec3 beaconWhite = vec3(0.95, 0.97, 1.0);
        vec3 crimsonFringe = vec3(0.85, 0.05, 0.15);
        vec3 beamColor = mix(crimsonFringe, beaconWhite, smoothstep(0.18, 0.0, abs(lightAngle - sweepAngle)));
        col += beamColor * inBeam * beamFade * 0.45;

        vec2 snowUv1 = uv;
        snowUv1.x += uTime * 0.7 + snowUv1.y * 0.35;
        snowUv1.y -= uTime * 0.9;
        vec2 grid1 = vec2(22.0, 18.0);
        vec2 id1 = floor(snowUv1 * grid1);
        float flake1 = step(0.94, hash(id1)) * smoothstep(0.3, 0.0, length(fract(snowUv1 * grid1) - 0.5));

        vec2 snowUv2 = uv;
        snowUv2.x += uTime * 1.1 + snowUv2.y * 0.25;
        snowUv2.y -= uTime * 1.4;
        vec2 grid2 = vec2(40.0, 30.0);
        vec2 id2 = floor(snowUv2 * grid2);
        float flake2 = step(0.97, hash(id2)) * smoothstep(0.25, 0.0, length(fract(snowUv2 * grid2) - 0.5));

        col += vec3(0.9, 0.95, 1.0) * (flake1 * 0.6 + flake2 * 0.4);

        float frostVignette = smoothstep(0.7, 1.35, length(uv));
        col = mix(col, vec3(0.7, 0.82, 0.95), frostVignette * 0.3);

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function WinterBeaconBanner({ isStatic = false, ...props }) {
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
            vertex: frostVert,
            fragment: frostFrag,
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
            program.uniforms.uTime.value = 1.4;
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
                <svg width="80" height="80" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 12px rgba(198, 40, 40, 0.65))" }}>
                    <defs>
                        <linearGradient id="silverPlate" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="45%" stopColor="#B0BEC5" />
                            <stop offset="75%" stopColor="#78909C" />
                            <stop offset="100%" stopColor="#37474F" />
                        </linearGradient>
                    </defs>
                    <path d="M50 15 L78 30 L78 70 L50 85 L22 70 L22 30 Z" stroke="url(#silverPlate)" strokeWidth="6" strokeLinejoin="round" />
                    <line x1="50" y1="34" x2="50" y2="66" stroke="#C62828" strokeWidth="3" strokeLinecap="round" />
                    <line x1="34" y1="50" x2="66" y2="50" stroke="#C62828" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        </div>
    );
}
