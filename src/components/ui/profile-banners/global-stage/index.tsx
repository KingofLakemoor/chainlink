"use client"
import { Renderer, Triangle, Program, Color, Mesh } from 'ogl';
import React, { useRef, useEffect } from 'react';
import './styles.css';

var styles = {"container":"uvc__container"};

const vert = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const frag = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
varying vec2 vUv;

// --- noise helpers ---
float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
        mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
        mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x),
        u.y
    );
    return res*res;
}

float fbm(vec2 p) {
    float f = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        f += a * noise(p);
        p *= 2.02;
        a *= 0.5;
    }
    return f;
}

void main() {
    vec2 uv = (vUv * 2.0 - 1.0) * vec2(clamp(uResolution.z, 1.0, 3.0), 1.0);

    // 1. Background: Deep moody blue sky transitioning to emerald pitch
    vec3 colorPitch = vec3(0.0, 0.35, 0.15);
    vec3 colorSky   = vec3(0.02, 0.05, 0.15);
    float skyMix = smoothstep(-0.6, 0.2, uv.y);
    vec3 bg = mix(colorPitch, colorSky, skyMix);

    // 1b. Subtle console haze / atmosphere
    float haze = fbm(uv * 2.5 + vec2(uTime * 0.03, -uTime * 0.02));
    bg += vec3(0.0, 0.12, 0.10) * haze * 0.35;

    // 2. Sweeping Stadium Floodlights
    float angleLeft  = atan(uv.y - 1.0, uv.x + 1.5);
    float angleRight = atan(uv.y - 1.0, uv.x - 1.5);

    float sweepLeft  = smoothstep(0.98, 1.0, sin(angleLeft * 3.0 + uTime * 1.2)) * 0.8;
    float sweepRight = smoothstep(0.98, 1.0, sin(angleRight * 3.0 - uTime * 0.9)) * 0.8;

    float lightMask = smoothstep(-0.5, 1.0, uv.y);
    vec3 lightCol = vec3(0.9, 0.95, 1.0);

    // base beams
    vec3 lights = lightCol * (sweepLeft + sweepRight) * lightMask * 0.25;

    // simple bloom / flare around top center
    vec2 flarePos = uv - vec2(0.0, 1.0);
    float flareR = length(flarePos);
    float flare = exp(-flareR * 6.0) * (sweepLeft + sweepRight) * 0.5;
    vec3 flareCol = vec3(0.9, 0.95, 1.0);
    lights += flareCol * flare * 0.6;

    // 3. Crowd light band on horizon
    float crowdY = mix(-0.1, 0.1, 0.5);
    float band = smoothstep(crowdY - 0.03, crowdY + 0.03, uv.y) *
                 (1.0 - smoothstep(crowdY + 0.03, crowdY + 0.12, uv.y));
    float crowdNoise = noise(vec2(uv.x * 80.0, floor(uv.y * 40.0))) * 0.8;
    float crowdFlicker = 0.5 + 0.5 * sin(uTime * 20.0 + uv.x * 15.0);
    float crowd = band * crowdNoise * crowdFlicker;
    vec3 crowdCol = vec3(0.9, 0.9, 1.0);
    vec3 crowdLights = crowdCol * crowd * 0.25;

    // 4. Holographic Knockout Bracket (more structured)
    vec2 buv = vUv * 2.0 - 1.0;
    buv.x *= clamp(uResolution.z, 1.0, 3.0);

    float bx = abs(buv.x);
    float by = buv.y + 0.1;

    float l16 = smoothstep(0.01, 0.0, abs(by - 0.45));
    float l8  = smoothstep(0.01, 0.0, abs(by - 0.15));
    float l4  = smoothstep(0.01, 0.0, abs(by + 0.15));

    float v1 = smoothstep(0.01, 0.0, abs(bx - 0.75)) * smoothstep(0.45, 0.15, by);
    float v2 = smoothstep(0.01, 0.0, abs(bx - 0.45)) * smoothstep(0.15, -0.15, by);
    float v3 = smoothstep(0.01, 0.0, abs(bx - 0.15)) * smoothstep(0.15, -0.15, by);

    float bracketShape = l16 + l8 + l4 + v1 + v2 + v3;
    bracketShape = clamp(bracketShape, 0.0, 1.0);

    float pulsePhase = uTime * 1.5;
    float pulse = 0.5 + 0.5 * sin(pulsePhase);
    float centerFalloff = 1.0 - smoothstep(0.0, 0.6, length(buv));
    float bracketPulse = mix(0.3, 1.0, pulse * centerFalloff);

    vec3 colorGold = vec3(1.0, 0.82, 0.3);
    vec3 bracket = colorGold * bracketShape * bracketPulse * 0.9;

    // 4b. Trophy node at center
    float trophyR = length(buv * vec2(1.2, 1.0));
    float trophy = smoothstep(0.12, 0.0, trophyR);
    float trophyPulse = 0.5 + 0.5 * sin(uTime * 3.0);
    vec3 trophyCol = mix(colorGold, vec3(1.0, 0.95, 0.8), trophyPulse);
    vec3 trophyGlow = trophyCol * trophy * 0.8;

    // 5. Combine all layers
    vec3 finalColor = bg;
    finalColor += lights;
    finalColor += crowdLights;
    finalColor += bracket;
    finalColor += trophyGlow;

    // 6. Subtle vignette
    vec2 rawUv = vUv * 2.0 - 1.0;
    float vignette = 1.0 - smoothstep(0.6, 1.4, length(rawUv));
    finalColor *= vignette;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

function GlobalStageBanner({ isStatic = false, ...props }: { isStatic?: boolean, [key: string]: any }) {
    const ctnDom = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        if (!ctnDom.current) return;

        const ctn = ctnDom.current;
        const renderer = new Renderer({
            alpha: true,
            depth: false,
        });

        const gl = renderer.gl;
        if (!gl) return;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
            },
            transparent: true,
        });

        const mesh = new Mesh(gl, { geometry, program });

        function resize() { if (!ctnDom.current) return;
            renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
            if (program.uniforms.uResolution) {
                program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
            }
        }

        window.addEventListener("resize", resize, false);
        resize();
        let animateId: number;

        if (isStatic) {
            program.uniforms.uTime.value = 2.5;
            if (mounted) renderer.render({ scene: mesh });
        } else {
            animateId = requestAnimationFrame(update);
        }

        function update(t: number) {
            animateId = requestAnimationFrame(update);
            program.uniforms.uTime.value = t * 0.001;
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
        <div className="absolute inset-0 w-full h-full" style={{ borderRadius: "8px", overflow: "hidden" }} {...props}>
            <div
                ref={ctnDom}
                className={styles['container']}
                style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            />

            {/* SVG Overlay */}
            <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
            }}>
                <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0px 0px 8px rgba(255, 204, 51, 0.8))", transform: "translateY(15%)" }}
                >
                    <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF2B2" />
                            <stop offset="50%" stopColor="#FFCC33" />
                            <stop offset="100%" stopColor="#B28000" />
                        </linearGradient>
                    </defs>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
            </div>
        </div>
    );
}

export { GlobalStageBanner };
