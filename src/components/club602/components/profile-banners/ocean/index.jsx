"use client"
import { Renderer, Triangle, Program, Color, Mesh, Texture } from 'ogl';
import React, { useRef, useEffect, useState } from 'react';
import './styles.css';

var styles = {"gradient-canvas":"ocean-banner__gradient-canvas", "banner-container": "ocean-banner__container", "banner-overlay": "ocean-banner__overlay"};

var vert = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
}
`;

var frag = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uHover;

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// 2D Rotation
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = vUv;
    // Aspect ratio correction for SDFs
    vec2 aspectUv = uv;
    float aspect = clamp(uResolution.x / uResolution.y, 1.0, 3.0);
    aspectUv.x *= aspect;

    // Wave speed
    float t = uTime * (0.08 + uHover * 0.04);

    // Base wave layer
    float wave1 = snoise(vec2(uv.x * 2.0 + t, uv.y * 1.5)) * 0.5;
    float wave2 = snoise(vec2(uv.x * 4.0 - t * 0.8, uv.y * 2.5)) * 0.25;
    float wave3 = snoise(vec2(uv.x * 6.0 + t * 0.4, uv.y * 3.5)) * 0.125;

    float waves = wave1 + wave2 + wave3;

    // Micro foam (high freq)
    float micro = snoise(vec2(uv.x * 12.0 + t * 1.2, uv.y * 8.0));
    // Mix foam only at the peaks
    float foam = smoothstep(0.45, 0.75, waves + micro * 0.1);

    // Palette
    vec3 deepColor = vec3(0.015, 0.078, 0.156); // #041428
    vec3 shallowColor = vec3(0.043, 0.227, 0.4); // #0B3A66
    vec3 foamColor = vec3(0.623, 0.839, 1.0);   // #9FD6FF (ice highlights)

    vec3 water = mix(deepColor, shallowColor, waves * 0.6 + 0.4);
    water = mix(water, foamColor, foam * 0.25);

    // Ring rendering (center right anchor)
    // Anchor center right in normalized space: e.g. x=0.75, y=0.5
    vec2 ringCenter = vec2(0.75 * aspect, 0.5);
    vec2 dUv = aspectUv - ringCenter;

    float dist = length(dUv);

    // Draw the ring
    float ringRadius = 0.4;
    float ringThickness = 0.02;
    float ringDist = abs(dist - ringRadius);

    // Add dashes by using angle
    float angle = atan(dUv.y, dUv.x);
    // Rotate ring
    float rotT = uTime * (0.2 + uHover * 0.3);
    angle += rotT;
    float dashCount = 12.0;
    float dashes = step(0.5, fract(angle * dashCount / (3.14159 * 2.0)));

    float ringAlpha = smoothstep(ringThickness, ringThickness - 0.005, ringDist);
    // Only solid if dashes == 1.0, but let's make it subtly continuous with bright dashes
    float ringIntensity = mix(0.3, 1.0, dashes);

    // Ring specular highlight
    // Create a faux normal from the SDF
    vec3 ringNormal = normalize(vec3(dUv, 0.5));
    // Sweeping light
    vec3 lightDir = normalize(vec3(sin(uTime), cos(uTime), 1.0));
    float specular = pow(max(dot(ringNormal, lightDir), 0.0), 32.0);

    // Composite ring
    vec3 finalRingColor = mix(shallowColor, foamColor, ringIntensity + specular * (0.5 + uHover * 0.5));
    water = mix(water, finalRingColor, ringAlpha);

    gl_FragColor = vec4(water, 1.0);
}
`;

function OceanBanner({ isStatic = false, ...props }) {
    const ctnDom = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    const targetHover = useRef(0.0);
    const currentHover = useRef(0.0);

    useEffect(() => {
        if (isHovered) {
            targetHover.current = 1.0;
        } else {
            targetHover.current = 0.0;
        }
    }, [isHovered]);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const actuallyStatic = isStatic || prefersReducedMotion;

        const ctn = ctnDom.current;
        let renderer, gl;
        try {
          renderer = new Renderer({ alpha: true });
        gl = renderer.gl;
        } catch(e) { console.error("WebGL Error", e); return; }
        if (!gl) return;
        gl.clearColor(1, 1, 1, 1);

        const geometry = new Triangle(gl);

        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
                uHover: { value: currentHover.current }
            },
        });
        const mesh = new Mesh(gl, { geometry, program });

        function resize() { if (!ctnDom.current) return;
            const scale = window.devicePixelRatio || 1;
            renderer.setSize(ctn.offsetWidth * scale, ctn.offsetHeight * scale);
            if (program.uniforms.uResolution) {
                program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
            }
        }
        window.addEventListener("resize", resize, false);
        resize();
        let animateId;

        if (actuallyStatic) {
            program.uniforms.uTime.value = 15.0; // A nice looking frame
            program.uniforms.uHover.value = 0.0;
            if (mounted) renderer.render({ scene: mesh });
        } else {
            animateId = requestAnimationFrame(update);
        }

        function update(t) {
            animateId = requestAnimationFrame(update);
            program.uniforms.uTime.value = t * 0.001;

            currentHover.current += (targetHover.current - currentHover.current) * 0.1;
            program.uniforms.uHover.value = currentHover.current;

            if (mounted) renderer.render({ scene: mesh });
        }

        ctn.appendChild(gl.canvas);
        return () => {
            mounted = false;
            if (animateId) cancelAnimationFrame(animateId);
            window.removeEventListener("resize", resize);
            if (ctnDom.current && ctnDom.current.contains(gl.canvas)) { ctnDom.current.removeChild(gl.canvas); }
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, [isStatic]);

    return (
        <div
            className={styles['banner-container']}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            <div ref={ctnDom} className={styles['gradient-canvas']} />
            <div className={styles['banner-overlay']} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', paddingLeft: '24px' }}>
                <svg width="250" height="40" viewBox="0 0 250 40">
                    <text x="10" y="30" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#fff" stroke="#000" strokeWidth="2">
                        ICE IN THE VEINS
                    </text>
                    <text x="10" y="30" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill="#9FD6FF">
                        ICE IN THE VEINS
                    </text>
                </svg>
                <div style={{ marginLeft: '10px', marginTop: '4px', fontSize: '14px', color: '#9FD6FF', fontFamily: 'sans-serif', letterSpacing: '2px', opacity: 0.8 }}>
                    UNBOTHERED
                </div>
            </div>
        </div>
    );
}

export { OceanBanner };
