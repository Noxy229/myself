import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

// ==========================================
// THE CONCEPT: "THE MONOLITH"
// Statt einem Terminal bauen wir eine abstrakte, monolithische Struktur im Nichts.
// Sie reagiert auf Mausbewegungen (Licht, Rotation). 
// Scrollen bewegt die Kamera physisch durch die Struktur.
// Verschiedene Ebenen der Struktur triggern UI-Panels im HTML.
// ==========================================

const container = document.getElementById('canvas-container');
const loader = document.getElementById('loader');
const progressEl = document.getElementById('load-progress');
const panelAbout = document.getElementById('panel-about');
const panelProjects = document.getElementById('panel-projects');

// SCENE SETUP
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030305, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ==========================================
// BUILD THE STRUCTURE (Data Core / Monolith)
// ==========================================
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// Geometrie für den Kern
const coreGeo = new THREE.IcosahedronGeometry(2, 1);
const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x111115,
    metalness: 0.9,
    roughness: 0.1,
    wireframe: true,
    transparent: true,
    opacity: 0.2
});
const core = new THREE.Mesh(coreGeo, coreMat);
coreGroup.add(core);

// Innere leuchtende Kugel
const innerGeo = new THREE.IcosahedronGeometry(1.2, 2);
const innerMat = new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true });
const inner = new THREE.Mesh(innerGeo, innerMat);
coreGroup.add(inner);

// Partikel/Datenstrom-Ringe
const particles = new THREE.BufferGeometry();
const particleCount = 2000;
const posArray = new Float32Array(particleCount * 3);

for(let i=0; i < particleCount * 3; i++) {
    // Erschaffe einen Zylinder aus Partikeln
    const r = 8 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 40;
    
    posArray[i*3] = r * Math.cos(theta);
    posArray[i*3+1] = y;
    posArray[i*3+2] = r * Math.sin(theta);
}
particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const partMat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x444455,
    transparent: true,
    opacity: 0.8
});
const particleSystem = new THREE.Points(particles, partMat);
scene.add(particleSystem);


// ==========================================
// LIGHTING
// ==========================================
const ambient = new THREE.AmbientLight(0x222233);
scene.add(ambient);

// Dieses Licht folgt der Maus
const mouseLight = new THREE.PointLight(0xff3333, 5, 20);
scene.add(mouseLight);


// ==========================================
// INTERACTION & ANIMATION
// ==========================================
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
let scrollY = 0;
let targetScroll = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Scrollrad steuert die Z-Tiefe der Kamera
document.addEventListener('wheel', (e) => {
    targetScroll += e.deltaY * 0.02;
    // Klemme das Scrollen (0 bis 30)
    targetScroll = Math.max(0, Math.min(30, targetScroll));
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Fake Ladesequenz für den Vibe
let loadProgress = 0;
const loadInterval = setInterval(() => {
    loadProgress += Math.floor(Math.random() * 10) + 1;
    if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(loadInterval);
        
        progressEl.innerText = '100%';
        setTimeout(() => {
            loader.style.opacity = '0';
            container.style.opacity = '1';
            setTimeout(() => loader.style.display = 'none', 1000);
        }, 500);
    } else {
        progressEl.innerText = loadProgress + '%';
    }
}, 100);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Lerping for smooth mouse follow
    targetX = mouseX * 2;
    targetY = mouseY * 2;
    
    // Maus bewegt das Licht und rotiert leicht den Kern
    mouseLight.position.x += (targetX * 5 - mouseLight.position.x) * 0.05;
    mouseLight.position.y += (targetY * 5 - mouseLight.position.y) * 0.05;
    mouseLight.position.z = 5;

    // Smoothes Scrollen (Kamera fährt rein/raus)
    scrollY += (targetScroll - scrollY) * 0.05;
    camera.position.z = 15 - scrollY;
    
    // UI Visibility basierend auf Scroll-Tiefe
    if (scrollY > 2 && scrollY < 12) {
        panelAbout.style.opacity = '1';
    } else {
        panelAbout.style.opacity = '0';
    }

    if (scrollY > 14 && scrollY < 25) {
        panelProjects.style.opacity = '1';
    } else {
        panelProjects.style.opacity = '0';
    }

    // Rotation
    coreGroup.rotation.y = time * 0.2 + mouseX * 0.5;
    coreGroup.rotation.x = mouseY * 0.2;
    
    inner.rotation.x = time * -0.5;
    inner.rotation.z = time * 0.3;

    particleSystem.rotation.y = time * 0.05;
    
    // Pulsierender Glitch auf der inneren Struktur
    innerMat.wireframeLinewidth = Math.sin(time * 10) * 2 + 3;

    renderer.render(scene, camera);
}

animate();