"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect, useState } from 'react';
import './styles.css';

var styles = {"container":"uvc__container"};

var vert = `attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}`;

var frag = `precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uHover;

varying vec2 vUv;

void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    // ring mask
    float inner = 0.85;
    float outer = 1.0;
    float ringMask = step(inner, r) * (1.0 - step(outer, r));

    // circuit lines
    float lanes = 24.0;
    float lane = smoothstep(0.0, 0.01, abs(fract(a / (6.28318 / lanes)) - 0.5));
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + r * 8.0);

    // Violet to green gradient
    vec3 baseCircuitCol = vec3(0.4, 0.1, 0.8); // Violet
    vec3 highlightCircuitCol = vec3(0.0, 1.0, 0.6); // Green
    vec3 circuitCol = mix(baseCircuitCol, highlightCircuitCol, sin(uTime * 0.5 + r * 4.0) * 0.5 + 0.5) * pulse;

    // Hover boost
    circuitCol += vec3(0.2, 0.5, 0.3) * uHover * pulse;

    // composite
    vec3 col = vec3(0.0);
    col += circuitCol * lane * ringMask * 0.6;
    gl_FragColor = vec4(col, ringMask * (lane * 0.6));
}`;

function PrimeCircuitRing({ isStatic = false, ...props }) {
    const ctnDom = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const hoverVal = useRef(0);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current)
            return;
        const ctn = ctnDom.current;
        const renderer = new Renderer({
            alpha: true,
            depth: false,
        });
        const gl = renderer.gl;
        if (!gl) return;
        function resize() { if (!ctnDom.current) return;
            renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
        }
        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(ctn);
        resize();
        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
                uHover: { value: 0 },
            },
            transparent: true,
        });
        const mesh = new Mesh(gl, { geometry, program });
        let animateId;

        if (isStatic) {
            program.uniforms.uTime.value = 5.0;
            if (mounted) renderer.render({ scene: mesh });
        } else {
            animateId = requestAnimationFrame(update);
        }

        function update(t) {
            animateId = requestAnimationFrame(update);
            program.uniforms.uTime.value = t * 0.001;

            // smooth hover
            const target = isHovered ? 1.0 : 0.0;
            hoverVal.current += (target - hoverVal.current) * 0.1;
            program.uniforms.uHover.value = hoverVal.current;

            if (mounted) renderer.render({ scene: mesh });
        }
        ctn.appendChild(gl.canvas);
        return () => {
            mounted = false;
            if (animateId) cancelAnimationFrame(animateId);
            resizeObserver.disconnect();
            if (ctnDom.current && ctnDom.current.contains(gl.canvas)) { ctnDom.current.removeChild(gl.canvas); }
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic, isHovered]);
    return (
        <div
            ref={ctnDom}
            className={styles['container']}
            style={{
                width: "100%",
                height: "100%",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
             <svg
                width="100%"
                height="100%"
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 pointer-events-none"
                style={{
                    animation: isStatic ? 'none' : 'spin 12s linear infinite',
                }}
            >
                <defs>
                    <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#00FF9C"/>
                        <stop offset="60%" stopColor="#003B2E"/>
                        <stop offset="100%" stopColor="#000000"/>
                    </radialGradient>
                </defs>

                <circle cx="128" cy="128" r="120"
                        fill="none"
                        stroke="url(#ringGrad)"
                        strokeWidth="16"
                        opacity="0.8"
                />

                <circle cx="128" cy="128" r="92"
                        fill="transparent"/>

                <g transform="translate(128, 128)">
                    <rect x="-18" y="104" width="36" height="18" rx="4"
                        fill="#000000"
                        stroke="#00FF9C"
                        strokeWidth="2"/>
                    <text x="0" y="117"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="Oswald, system-ui"
                        fontSize="12"
                        fill="#FFFFFF">
                        V1
                    </text>
                </g>
            </svg>
            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export { PrimeCircuitRing };
