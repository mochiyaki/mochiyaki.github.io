// State
const state = {
    lampOn: false,
    tvOn: false,
    tvChannel: 1,
    computerOn: false,
    isPointerLocked: false,
    isUsingComputer: false,
    isSitting: false,
    cliHistory: [],
    catPetCount: 0
};

// Audio context for sounds
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, duration, type = 'sine', volume = 0.1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playMeow() {
    initAudio();
    playTone(600, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(400, 0.2, 'sine', 0.12), 100);
}

function playPurr() {
    initAudio();
    for (let i = 0; i < 10; i++) {
        setTimeout(() => playTone(80 + Math.random() * 20, 0.1, 'triangle', 0.05), i * 80);
    }
}

function playClick() {
    initAudio();
    playTone(1200, 0.05, 'square', 0.05);
}

function playStatic() {
    initAudio();
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
}

function playKeypress() {
    initAudio();
    playTone(800 + Math.random() * 400, 0.03, 'square', 0.02);
}

// Scene setup
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1f1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.3);
scene.add(ambientLight);

const windowLight = new THREE.DirectionalLight(0xffeedd, 0.5);
windowLight.position.set(5, 4, 3);
windowLight.castShadow = true;
scene.add(windowLight);

const lampLight = new THREE.PointLight(0xffaa44, 0, 8);
lampLight.position.set(-3, 2, -2);
lampLight.castShadow = true;
scene.add(lampLight);

const tvLight = new THREE.PointLight(0x4488ff, 0, 5);
tvLight.position.set(0, 1.5, -4.5);
scene.add(tvLight);

// Materials
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.9 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1 });
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
const cushionMat = new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.9 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.3 });
const screenOffMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
const catMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 });

// Interactive objects storage
const interactiveObjects = [];

// Room
const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), woodMat);
floor.position.y = -0.1;
floor.receiveShadow = true;
scene.add(floor);

const rug = new THREE.Mesh(new THREE.BoxGeometry(4, 0.02, 3), rugMat);
rug.position.set(0, 0.01, 0);
scene.add(rug);

// Walls
const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.2), wallMat);
backWall.position.set(0, 2, -5.9);
scene.add(backWall);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 12), wallMat);
leftWall.position.set(-5.9, 2, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 12), wallMat);
rightWall.position.set(5.9, 2, 0);
scene.add(rightWall);

// Window on right wall
const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 2.5), new THREE.MeshStandardMaterial({ color: 0xf0e6d0 }));
windowFrame.position.set(5.85, 2, 0);
scene.add(windowFrame);

const windowGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.8, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.3 })
);
windowGlass.position.set(5.8, 2, 0);
scene.add(windowGlass);

// Ceiling
const ceiling = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), wallMat);
ceiling.position.y = 4;
scene.add(ceiling);

// TV Stand
const tvStand = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.6), woodMat);
tvStand.position.set(0, 0.3, -5);
tvStand.castShadow = true;
scene.add(tvStand);

// TV
const tvGroup = new THREE.Group();
const tvBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.1), metalMat);
tvBody.castShadow = true;
tvGroup.add(tvBody);

const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 0.02), screenOffMat);
tvScreen.position.z = 0.06;
tvScreen.userData = { type: 'tv', name: 'Television' };
interactiveObjects.push(tvScreen);
tvGroup.add(tvScreen);

tvGroup.position.set(0, 1.3, -5.4);
scene.add(tvGroup);

// Sofa
const sofaGroup = new THREE.Group();
const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), fabricMat);
sofaBase.position.y = 0.25;
sofaBase.castShadow = true;
sofaGroup.add(sofaBase);

const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.3), fabricMat);
sofaBack.position.set(0, 0.6, -0.35);
sofaBack.castShadow = true;
sofaGroup.add(sofaBack);

const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1), fabricMat);
sofaArmL.position.set(-1.35, 0.5, 0);
sofaArmL.castShadow = true;
sofaGroup.add(sofaArmL);

const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1), fabricMat);
sofaArmR.position.set(1.35, 0.5, 0);
sofaArmR.castShadow = true;
sofaGroup.add(sofaArmR);

const cushion1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), cushionMat);
cushion1.position.set(-0.8, 0.65, -0.2);
cushion1.rotation.x = -0.2;
sofaGroup.add(cushion1);

const cushion2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), cushionMat);
cushion2.position.set(0.8, 0.65, -0.2);
cushion2.rotation.x = -0.2;
sofaGroup.add(cushion2);

sofaGroup.position.set(0, 0, 1);

const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
sofaSeat.position.set(0, 0.55, 0.1);
sofaSeat.userData = { type: 'sofa', name: 'Sofa (Sit)' };
interactiveObjects.push(sofaSeat);
sofaGroup.add(sofaSeat);

scene.add(sofaGroup);

// Lamp
const lampGroup = new THREE.Group();
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.1, 16), metalMat);
lampBase.position.y = 0.05;
lampGroup.add(lampBase);

const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), metalMat);
lampPole.position.y = 0.8;
lampGroup.add(lampPole);

const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.4, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf5deb3, side: THREE.DoubleSide, roughness: 0.9 })
);
lampShade.position.y = 1.7;
lampShade.rotation.x = Math.PI;
lampShade.userData = { type: 'lamp', name: 'Lamp' };
interactiveObjects.push(lampShade);
lampGroup.add(lampShade);

const lampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
);
lampBulb.position.y = 1.55;
lampGroup.add(lampBulb);

lampGroup.position.set(-3, 0, -2);
scene.add(lampGroup);

// Desktop Computer
const deskGroup = new THREE.Group();

const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.8), woodMat);
desk.position.y = 0.75;
desk.castShadow = true;
deskGroup.add(desk);

const deskLegFL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodMat);
deskLegFL.position.set(-0.65, 0.375, 0.3);
deskGroup.add(deskLegFL);

const deskLegFR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodMat);
deskLegFR.position.set(0.65, 0.375, 0.3);
deskGroup.add(deskLegFR);

const deskLegBL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodMat);
deskLegBL.position.set(-0.65, 0.375, -0.3);
deskGroup.add(deskLegBL);

const deskLegBR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), woodMat);
deskLegBR.position.set(0.65, 0.375, -0.3);
deskGroup.add(deskLegBR);

const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), metalMat);
monitor.position.set(0, 1.05, -0.2);
monitor.castShadow = true;
deskGroup.add(monitor);

const monitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.01), screenOffMat);
monitorScreen.position.set(0, 1.05, -0.17);
monitorScreen.userData = { type: 'computer', name: 'Computer' };
interactiveObjects.push(monitorScreen);
deskGroup.add(monitorScreen);

const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), metalMat);
monitorStand.position.set(0, 0.87, -0.2);
deskGroup.add(monitorStand);

const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), metalMat);
keyboard.position.set(0, 0.8, 0.1);
deskGroup.add(keyboard);

const tower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.3), metalMat);
tower.position.set(0.55, 0.97, -0.1);
tower.castShadow = true;
deskGroup.add(tower);

const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), fabricMat);
chair.position.set(0, 0.45, 0.6);
deskGroup.add(chair);

const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), fabricMat);
chairBack.position.set(0, 0.7, 0.82);
deskGroup.add(chairBack);

deskGroup.position.set(3.5, 0, -3);
scene.add(deskGroup);

// Cat
const catGroup = new THREE.Group();

const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), catMat);
catBody.scale.set(1, 0.8, 1.3);
catBody.position.y = 0.2;
catBody.castShadow = true;
catGroup.add(catBody);

const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), catMat);
catHead.position.set(0, 0.35, 0.25);
catHead.castShadow = true;
catGroup.add(catHead);

const earL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), catMat);
earL.position.set(-0.08, 0.48, 0.25);
earL.rotation.z = -0.3;
catGroup.add(earL);

const earR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), catMat);
earR.position.set(0.08, 0.48, 0.25);
earR.rotation.z = 0.3;
catGroup.add(earR);

const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
eyeWhiteL.position.set(-0.05, 0.38, 0.38);
catGroup.add(eyeWhiteL);

const eyeWhiteR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
eyeWhiteR.position.set(0.05, 0.38, 0.38);
catGroup.add(eyeWhiteR);

const eyePupilL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), new THREE.MeshBasicMaterial({ color: 0x222222 }));
eyePupilL.position.set(-0.05, 0.38, 0.41);
catGroup.add(eyePupilL);

const eyePupilR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), new THREE.MeshBasicMaterial({ color: 0x222222 }));
eyePupilR.position.set(0.05, 0.38, 0.41);
catGroup.add(eyePupilR);

const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffaaaa }));
nose.position.set(0, 0.33, 0.4);
catGroup.add(nose);

const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.4, 8), catMat);
tail.position.set(0, 0.25, -0.35);
tail.rotation.x = -0.8;
catGroup.add(tail);

const catHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
);
catHitbox.position.set(0, 0.25, 0);
catHitbox.userData = { type: 'cat', name: 'Cat (Pet me!)' };
interactiveObjects.push(catHitbox);
catGroup.add(catHitbox);

catGroup.position.set(-2, 0, 1);
scene.add(catGroup);

// Movement
const moveSpeed = 0.08;
const lookSpeed = 0.002;
const keys = {};
let yaw = 0;
let pitch = 0;

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (state.isUsingComputer && e.code === 'Escape') {
        exitComputer();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

document.addEventListener('mousemove', (e) => {
    if (!state.isPointerLocked || state.isUsingComputer) return;
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});

// Pointer lock
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
    initAudio();
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    state.isPointerLocked = document.pointerLockElement === renderer.domElement;
    startOverlay.style.display = state.isPointerLocked ? 'none' : 'flex';
    if (!state.isPointerLocked && state.isUsingComputer) {
        exitComputer();
    }
});

// Raycaster for interactions
const raycaster = new THREE.Raycaster();
const crosshair = document.getElementById('crosshair');
const tooltip = document.getElementById('tooltip');

function checkInteraction() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    
    if (intersects.length > 0 && intersects[0].distance < 4) {
        const obj = intersects[0].object;
        tooltip.textContent = obj.userData.name;
        tooltip.style.display = 'block';
        crosshair.style.color = '#ffcc00';
        return obj;
    } else {
        tooltip.style.display = 'none';
        crosshair.style.color = '#ffffff';
        return null;
    }
}

// Click interactions
renderer.domElement.addEventListener('click', () => {
    if (!state.isPointerLocked || state.isUsingComputer) return;
    
    const target = checkInteraction();
    if (!target) return;
    
    const type = target.userData.type;
    
    switch (type) {
        case 'lamp':
            toggleLamp();
            break;
        case 'tv':
            toggleTV();
            break;
        case 'computer':
            enterComputer();
            break;
        case 'cat':
            petCat();
            break;
        case 'sofa':
            sitOnSofa();
            break;
    }
});

function toggleLamp() {
    playClick();
    state.lampOn = !state.lampOn;
    lampLight.intensity = state.lampOn ? 1.5 : 0;
    lampGroup.children[3].material.color.setHex(state.lampOn ? 0xffdd88 : 0x333333);
    ambientLight.intensity = state.lampOn ? 0.4 : 0.3;
}

function toggleTV() {
    if (!state.tvOn) {
        state.tvOn = true;
        playClick();
    } else {
        state.tvChannel = (state.tvChannel % 5) + 1;
        playStatic();
    }
    updateTV();
}

function updateTV() {
    if (state.tvOn) {
        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
        tvScreen.material = new THREE.MeshBasicMaterial({ color: colors[state.tvChannel - 1] });
        tvLight.intensity = 0.8;
    } else {
        tvScreen.material = screenOffMat;
        tvLight.intensity = 0;
    }
}

const catBubble = document.getElementById('cat-bubble');
const catSounds = ['Meow!?', 'I am joining a Hackathon', 'Do you know who is Adam?', 'Claude Code Hack Day', 'at AWS Builder Loft', 'with Jam.dev'];

function petCat() {
    state.catPetCount++;
    
    if (state.catPetCount % 3 === 0) {
        playPurr();
    } else {
        playMeow();
    }
    
    catBubble.textContent = catSounds[Math.floor(Math.random() * catSounds.length)];
    catBubble.style.display = 'block';
    catBubble.style.opacity = '1';
    
    setTimeout(() => {
        catBubble.style.opacity = '0';
        setTimeout(() => catBubble.style.display = 'none', 300);
    }, 1500);
}

function sitOnSofa() {
    state.isSitting = !state.isSitting;
    if (state.isSitting) {
        camera.position.set(0, 1.1, 1.2);
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
    }
}

// CLI
const cliContainer = document.getElementById('cli-container');
const cliOutput = document.getElementById('cli-output');
const cliInput = document.getElementById('cli-input');

function enterComputer() {
    state.isUsingComputer = true;
    state.computerOn = true;
    playClick();
    
    // Open new tab with mochiyaki website
    window.open('https://mochiyaki.github.io', '_blank');
    
    monitorScreen.material = new THREE.MeshBasicMaterial({ color: 0x001100 });
    
    cliContainer.style.display = 'flex';
    cliOutput.innerHTML = '';
    appendCLI('OS v1.0 - Welcome!');
    appendCLI('Type "help" for available commands.');
    appendCLI('');
    cliInput.focus();
    
    document.exitPointerLock();
}

function exitComputer() {
    state.isUsingComputer = false;
    cliContainer.style.display = 'none';
    monitorScreen.material = screenOffMat;
    state.computerOn = false;
    
    setTimeout(() => {
        renderer.domElement.requestPointerLock();
    }, 100);
}

function appendCLI(text) {
    const line = document.createElement('div');
    line.textContent = text;
    cliOutput.appendChild(line);
    cliOutput.scrollTop = cliOutput.scrollHeight;
}

cliInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = cliInput.value.trim().toLowerCase();
        appendCLI('$ ' + cmd);
        processCommand(cmd);
        cliInput.value = '';
    }
    playKeypress();
});

function processCommand(cmd) {
    switch (cmd) {
        case 'help':
            appendCLI('Available commands:');
            appendCLI('  help  - Show this help');
            appendCLI('  hello - Say hello');
            appendCLI('  cat   - Show ASCII cat');
            appendCLI('  time  - Show current time');
            appendCLI('  clear - Clear screen');
            appendCLI('  joke  - Tell a joke');
            appendCLI('  exit  - Exit computer');
            break;
        case 'hello':
            appendCLI('Hello, cozy human! 🏠');
            break;
        case 'cat':
            appendCLI('  /\\_/\\  ');
            appendCLI(' ( o.o ) ');
            appendCLI('  > ^ <  ');
            appendCLI(' /|   |\\');
            appendCLI('(_|   |_)');
            break;
        case 'time':
            appendCLI('Current time: ' + new Date().toLocaleTimeString());
            break;
        case 'clear':
            cliOutput.innerHTML = '';
            break;
        case 'joke':
            const jokes = [
                'Why do programmers prefer dark mode? Because light attracts bugs!',
                'A cat walked into a bar... and got stuck on the keyboard. asdfghjkl;',
                'Why did the lamp break up with the sofa? It needed more space!',
                'What do you call a cat that sits on a computer? A lap-top!'
            ];
            appendCLI(jokes[Math.floor(Math.random() * jokes.length)]);
            break;
        case 'exit':
            exitComputer();
            break;
        case '':
            break;
        default:
            appendCLI('Unknown command: ' + cmd);
            appendCLI('Type "help" for available commands.');
    }
    appendCLI('');
}

// Animation
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.016;
    
    // Movement
    if (state.isPointerLocked && !state.isUsingComputer && !state.isSitting) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        
        if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, moveSpeed);
        if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -moveSpeed);
        if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -moveSpeed);
        if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, moveSpeed);
        
        // Bounds
        camera.position.x = Math.max(-5, Math.min(5, camera.position.x));
        camera.position.z = Math.max(-5, Math.min(5, camera.position.z));
    }
    
    // Cat idle animation
    catBody.position.y = 0.2 + Math.sin(time * 2) * 0.01;
    tail.rotation.z = Math.sin(time * 3) * 0.2;
    
    // Cat blink
    const blinkPhase = (time % 4);
    if (blinkPhase > 3.9) {
        eyeWhiteL.scale.y = 0.1;
        eyeWhiteR.scale.y = 0.1;
        eyePupilL.visible = false;
        eyePupilR.visible = false;
    } else {
        eyeWhiteL.scale.y = 1;
        eyeWhiteR.scale.y = 1;
        eyePupilL.visible = true;
        eyePupilR.visible = true;
    }
    
    // Cat looks around
    const lookX = Math.sin(time * 0.5) * 0.05;
    catHead.rotation.y = lookX;
    
    // TV static effect when on
    if (state.tvOn) {
        const flicker = 0.95 + Math.random() * 0.1;
        tvLight.intensity = 0.8 * flicker;
    }
    
    // Lamp flicker when on
    if (state.lampOn) {
        lampLight.intensity = 1.5 + Math.sin(time * 20) * 0.02;
    }
    
    // Check hover
    if (state.isPointerLocked && !state.isUsingComputer) {
        checkInteraction();
    }
    
    renderer.render(scene, camera);
}

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();