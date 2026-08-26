import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

// ==========================================
// 3D INTRO SETUP
// ==========================================
// Wenn du später ein eigenes 3D-Modell hast, leg die .glb Datei in den Ordner und trage hier den Namen ein!
// Beispiel: const MODEL_URL = "sci-fi-room.glb";
const MODEL_URL = null; 

const introOverlay = document.getElementById('intro-overlay');
const startBtn = document.getElementById('start-btn');
const terminalApp = document.querySelector('.terminal-container');
const scanlines = document.querySelector('.scanlines');
const vignette = document.querySelector('.vignette');

// Verstecke das normale Terminal zu Beginn
terminalApp.style.opacity = '0';
terminalApp.style.pointerEvents = 'none';
scanlines.style.opacity = '0';
vignette.style.opacity = '0';

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0000, 0.05); // Creepy roter Mars-Nebel

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x050000, 1);
document.getElementById('webgl-container').appendChild(renderer.domElement);

// Kamera Startposition (weit hinten im Gang)
camera.position.set(0, 2, 20);

// ==========================================
// ENVIRONMENT GENERATION (Fallback wenn kein Modell)
// ==========================================
let monitorTarget = new THREE.Vector3(0, 1.5, -5);

if (MODEL_URL) {
    // Lade echtes 3D Modell
    const loader = new GLTFLoader();
    loader.load(MODEL_URL, (gltf) => {
        scene.add(gltf.scene);
        // Hinweis: Hier müsstest du monitorTarget auf die Koordinaten deines Bildschirms im Modell anpassen
    });
} else {
    // Generiere prozeduralen UAC Retro-Gang
    const gridHelper = new THREE.GridHelper(50, 50, 0xff0000, 0x440000);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const gridHelperTop = new THREE.GridHelper(50, 50, 0xff0000, 0x440000);
    gridHelperTop.position.y = 4;
    scene.add(gridHelperTop);

    // Virtueller Monitor
    const geometry = new THREE.BoxGeometry(4, 2.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    const monitor = new THREE.Mesh(geometry, material);
    monitor.position.copy(monitorTarget);
    scene.add(monitor);

    // Leuchtender Bildschirm
    const screenGeo = new THREE.PlaneGeometry(3.8, 2.3);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.5, -4.74);
    scene.add(screenMesh);
}

// Lichter
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xff0000, 2, 20);
pointLight.position.set(0, 2, -3);
scene.add(pointLight);

// ==========================================
// ANIMATION & RESIZE
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let isAnimating = false;
let walkTime = 0;

function animate() {
    requestAnimationFrame(animate);
    
    if (isAnimating) {
        // Head-bobbing Effekt
        walkTime += 0.1;
        camera.position.y = 2 + Math.sin(walkTime) * 0.1;
    }
    
    renderer.render(scene, camera);
}
animate();

// ==========================================
// THE SEQUENCE
// ==========================================

// Global Theme Update Function for Terminal
window.updateWebGLTheme = (themeName) => {
    if (themeName === 'cyberpunk') {
        scene.fog.color.setHex(0x000515); // Dark blue fog
        pointLight.color.setHex(0x00f3ff); // Cyan light
        if (typeof screenMat !== 'undefined') screenMat.color.setHex(0x00f3ff);
        if (typeof gridHelper !== 'undefined') {
            gridHelper.material.color.setHex(0x00f3ff);
            gridHelperTop.material.color.setHex(0x00f3ff);
        }
    } else {
        // Doom Theme
        scene.fog.color.setHex(0x0a0000); 
        pointLight.color.setHex(0xff0000);
        if (typeof screenMat !== 'undefined') screenMat.color.setHex(0xff0000);
        if (typeof gridHelper !== 'undefined') {
            gridHelper.material.color.setHex(0xff0000);
            gridHelperTop.material.color.setHex(0xff0000);
        }
    }
};

startBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Verhindert dass Mobile Browser extra Dinge machen
    introOverlay.style.opacity = '0';
    introOverlay.style.pointerEvents = 'none'; // Direkt klicks deaktivieren
    
    isAnimating = true;

    // Lade GSAP dynamisch für die smoothe Kamerafahrt
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    document.body.appendChild(script);

    script.onload = () => {
        // Sequenz: Erst hinlaufen, dann reinzoomen
        const tl = gsap.timeline({
            onComplete: () => {
                isAnimating = false;
                
                // Overlay mit Button sofort ganz weg
                introOverlay.style.display = 'none';

                // Transition zu 2D HTML Terminal
                document.getElementById('webgl-container').style.opacity = '0';
                
                terminalApp.style.transition = 'opacity 1s ease-in';
                scanlines.style.transition = 'opacity 1s ease-in';
                vignette.style.transition = 'opacity 1s ease-in';
                
                terminalApp.style.opacity = '1';
                terminalApp.style.pointerEvents = 'auto';
                scanlines.style.opacity = '1';
                vignette.style.opacity = '1';
                
                setTimeout(() => {
                    document.getElementById('webgl-container').style.display = 'none';
                    // Erst GANZ AM ENDE den Focus holen, wenn das Terminal da ist
                    const inputField = document.getElementById('command-input');
                    if (inputField) {
                        // Auf Mobile triggert ein Focus() aus einem setTimeout oft die Tastatur NICHT korrekt,
                        // weil es nicht Teil des direkten User-Clicks ist. 
                        // Aber das Terminal zerschiesst nicht mehr den Intro-Screen.
                        inputField.focus();
                    }
                }, 1000);
            }
        });

        // 1. Auf den Monitor zulaufen
        tl.to(camera.position, {
            z: monitorTarget.z + 2,
            duration: 3,
            ease: "power2.inOut"
        });

        // 2. Head-Bobbing stoppen und exakt auf Bildschirmmitte zoomen
        tl.to(camera.position, {
            x: monitorTarget.x,
            y: monitorTarget.y,
            z: monitorTarget.z + 0.1, // Ganz nah ans "Glas"
            duration: 1.5,
            ease: "power4.in"
        });
    };
});
