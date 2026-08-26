import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ==========================================
// SCENE SETUP
// ==========================================
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30);

// ==========================================
// THE QUANTUM SINGULARITY (100k Particles)
// ==========================================
const particleCount = 100000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);

const colorRed = new THREE.Color(0xff2a2a);
const colorWhite = new THREE.Color(0xffffff);
const colorDim = new THREE.Color(0x333333);

for (let i = 0; i < particleCount; i++) {
    // Spherical distribution with a hollow core
    const r = 5 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Coloring based on distance from center
    const mixedColor = new THREE.Color();
    if (r < 8) {
        mixedColor.copy(colorRed);
    } else if (r > 25) {
        mixedColor.copy(colorDim);
    } else {
        mixedColor.copy(colorWhite).lerp(colorRed, Math.random());
    }
    
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;
    
    sizes[i] = Math.random() * 2;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// Custom Shader Material for Particles
const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        pixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
        uniform float time;
        uniform float pixelRatio;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            vec3 pos = position;
            
            // Subtle wave distortion based on time and position
            float wave = sin(pos.x * 0.5 + time) * cos(pos.z * 0.5 + time) * 0.5;
            pos.y += wave;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * pixelRatio * (30.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        
        void main() {
            // Circular particle with soft edge
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - (dist * 2.0);
            gl_FragColor = vec4(vColor, alpha * 0.8);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// ==========================================
// CORE WIREFRAME (Abstract Geometry)
// ==========================================
const coreGeo = new THREE.IcosahedronGeometry(4, 2);
const coreMat = new THREE.MeshBasicMaterial({ 
    color: 0x111111, 
    wireframe: true,
    transparent: true,
    opacity: 0.3
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
scene.add(coreMesh);


// ==========================================
// POST-PROCESSING (Bloom & Chromatic Aberration)
// ==========================================
const renderScene = new RenderPass(scene, camera);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);

// Unreal Bloom
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;
composer.addPass(bloomPass);

// Custom Chromatic Aberration Shader
const ChromaticAberrationShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "amount":   { value: 0.003 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        
        void main() {
            vec2 offset = vec2(amount, 0.0);
            vec4 cr = texture2D(tDiffuse, vUv + offset);
            vec4 cga = texture2D(tDiffuse, vUv);
            vec4 cb = texture2D(tDiffuse, vUv - offset);
            gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
        }
    `
};
const rgbShiftPass = new ShaderPass(ChromaticAberrationShader);
composer.addPass(rgbShiftPass);


// ==========================================
// INTERACTION & CAMERA LOGIC
// ==========================================
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

// Camera Target positions based on active UI panel
const CAMERA_STATES = {
    home: { x: 0, y: 0, z: 30 },
    hardware: { x: -8, y: 5, z: 12 },
    software: { x: 8, y: -5, z: 8 }
};
let currentCamState = 'home';
let baseCamPos = new THREE.Vector3(0, 0, 30);

document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Touch Support
document.addEventListener('touchmove', (e) => {
    mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
}, { passive: true });

// Listen to UI Navigation
window.addEventListener('nav-changed', (e) => {
    currentCamState = e.detail.target;
    if (CAMERA_STATES[currentCamState]) {
        baseCamPos.copy(CAMERA_STATES[currentCamState]);
        
        // Boost RGB shift temporarily on transition (Glitch effect)
        rgbShiftPass.uniforms.amount.value = 0.02;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Update UI Coordinates display
const coordsEl = document.getElementById('coords');

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Shader Time Update
    particleMaterial.uniforms.time.value = time;

    // Smooth Mouse Tracking
    targetX = mouseX * 2;
    targetY = mouseY * 2;

    // Dynamic Camera Positioning (Base Position + Mouse Offset)
    camera.position.x += ((baseCamPos.x + targetX) - camera.position.x) * 0.05;
    camera.position.y += ((baseCamPos.y + targetY) - camera.position.y) * 0.05;
    camera.position.z += (baseCamPos.z - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);

    // Rotate core structures
    particleSystem.rotation.y = time * 0.05;
    particleSystem.rotation.z = time * 0.02;
    coreMesh.rotation.x = time * 0.1;
    coreMesh.rotation.y = time * 0.15;

    // Decay Chromatic Aberration back to normal
    rgbShiftPass.uniforms.amount.value += (0.003 - rgbShiftPass.uniforms.amount.value) * 0.1;

    // Update UI Coords
    if(coordsEl) {
    coordsEl.innerText = `X: ${camera.position.x.toFixed(4)} | Y: ${camera.position.y.toFixed(4)} | Z: ${camera.position.z.toFixed(4)}`;
    }

    // Render via Composer (Post-Processing)
    if (composer) {
    composer.render();
    } else {
    renderer.render(scene, camera);
    }
    }

animate();