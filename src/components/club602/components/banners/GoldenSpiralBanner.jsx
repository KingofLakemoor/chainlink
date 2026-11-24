"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

const goldenSpiralVert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const goldenSpiralFrag = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.z, 1.0);

        // Los Angeles Golden Hour Sunset Backdrop (Pacific Dusk Purple to Warm Amber)
        vec3 duskPurple = vec3(0.12, 0.02, 0.22);
        vec3 sunsetAmber = vec3(0.32, 0.12, 0.02);
        vec3 col = mix(sunsetAmber, duskPurple, uv.y * 0.5 + 0.5);

        // Polar coordinates for Golden Spiral calculation
        float r = length(uv);
        float angle = atan(uv.y, uv.x);

        // Logarithmic / Golden Ratio Spiral arms
        float spiral1 = sin(log(r + 0.05) * 3.5 - angle * 2.0 + uTime * 1.2);
        float spiralArm1 = smoothstep(0.82, 1.0, spiral1) * smoothstep(1.6, 0.1, r);

        float spiral2 = sin(log(r + 0.05) * 3.5 - angle * 2.0 - 3.14159 + uTime * 1.2);
        float spiralArm2 = smoothstep(0.82, 1.0, spiral2) * smoothstep(1.6, 0.1, r);

        vec3 goldColor = vec3(1.0, 0.75, 0.12);
        vec3 magentaGlow = vec3(0.90, 0.22, 0.55);

        col += goldColor * (spiralArm1 + spiralArm2) * 1.2;
        col += magentaGlow * (spiralArm1 + spiralArm2) * 0.5;

        // Floating Golden Hour Bokeh / Sunset Dust Embers
        vec2 bokehUv = uv;
        bokehUv.y -= uTime * 0.15;
        vec2 grid = vec2(20.0, 12.0);
        vec2 id = floor(bokehUv * grid);
        vec2 st = fract(bokehUv * grid) - 0.5;

        float isParticle = step(0.92, hash(id));
        float pGlow = 0.01 / (length(st) + 0.005) * isParticle;
        col += goldColor * pGlow * 0.4 * (0.6 + 0.4 * sin(uTime * 3.0 + hash(id) * 10.0));

        // Depth Vignette
        col *= smoothstep(1.8, 0.5, r);

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function GoldenSpiralBanner({ isStatic = false, ...props }) {
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
            vertex: goldenSpiralVert,
            fragment: goldenSpiralFrag,
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
            program.uniforms.uTime.value = 4.8; // Captures peak spiral expansion and golden bokeh balance
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
                {/* Hollywood Star / Golden Spiral Link Icon */}
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style={{ filter: "drop-shadow(0px 0px 12px rgba(255, 184, 0, 0.8))" }}>
                    <defs>
                        <linearGradient id="laGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF176" />
                            <stop offset="50%" stopColor="#FFB800" />
                            <stop offset="100%" stopColor="#E65100" />
                        </linearGradient>
                    </defs>
                    {/* Hollywood Star Motif Outer */}
                    <path d="M50 12 L61 36 L87 38 L67 55 L73 80 L50 66 L27 80 L33 55 L13 38 L39 36 Z" fill="url(#laGold)" opacity="0.95" />
                    {/* Inner Golden Spiral Circle */}
                    <circle cx="50" cy="50" r="16" stroke="#1F002B" strokeWidth="4" fill="none" />
                    <circle cx="50" cy="50" r="10" stroke="url(#laGold)" strokeWidth="3" fill="none" />
                </svg>
            </div>
        </div>
    );
}
