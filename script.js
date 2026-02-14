const outputElement = document.getElementById('output');
const inputElement = document.getElementById('command-input');
const terminalWindow = document.getElementById('terminal-window');

// User Data
const USER_PROFILE = {
    role: "Fachinformatiker Systemintegration",
    location: "Niedersachsen, DE",
    age: "16",
    status: "APPRENTICESHIP // ACTIVE",
    hardware: {
        cpu: "Intel i5-13600KF",
        gpu: "Radeon RX 9070 XT",
        case: "Hyte Y60 [NOCTUA STEALTH]",
        displays: "3x LG ARRAY",
        mobile: "OnePlus 12"
    },
    hobbies: ["HIGH-END PC BUILDING", "HOME NETWORKING", "TECH ENTHUSIAST"]
};

// State
let commandHistory = [];
let historyIndex = -1;
let currentTheme = 'doom';

// Load saved state
const SAVED_STATE = JSON.parse(localStorage.getItem('terminal_save_data')) || {
    uacHacked: false,
    arasakaHacked: false,
    achievementUnlocked: false
};

function saveGameState() {
    localStorage.setItem('terminal_save_data', JSON.stringify(SAVED_STATE));
}

const DOOM_LOGO = `
    ____  ____  ____  __  __ 
   |  _ \\|  _ \\|  _ \\|  \\/  |
   | | | | | | | | | | |\\/| |
   | |_| | |_| | |_| | |  | |
   |____/|____/|____/|_|  |_|
                             
   ETERNAL // PORTFOLIO SYSTEM
`;

const CYBERPUNK_LOGO = `
    ____ _  _ ___  ____ ____ ___  _  _ _  _ _  _ 
    |    \\  / |__] |___ |__/ |__] |  | |\\ | |_/  
    |___  \\/  |__] |___ |  \\ |    |__| | \\| | \\_ 
                                                 
    ARASAKA // NEURAL LINK ESTABLISHED
`;

// File System Structure
const FILE_SYSTEM = {
    root: {
        type: 'dir',
        children: {
            'projects': { type: 'dir', children: {} },
            'about.txt': { type: 'file', content: USER_PROFILE.role },
            '.uac_secure': {
                type: 'dir',
                locked: !SAVED_STATE.uacHacked,
                visible: SAVED_STATE.uacHacked,
                id: 'uacHacked',
                securityLevel: 3,
                theme: 'doom',
                children: {
                    'UAC_REPORT_004.txt': {
                        type: 'file',
                        content: `<span class="header">>>> UAC SECURITY REPORT [PRIORITY: ALPHA]</span><br>
<span class="value">FROM: DR. PIERCE BENNETT<br>TO: O. PIERCE<br><br>
He is here. The containment unit was breached at 0400. We threw everything at him... The Barons, the Cyberdemon... nothing slowed him down.<br>
He doesn't speak. He doesn't stop. He just... tears them apart.<br><br>
<span class="blink-warning">EVACUATE THE FACILITY. GOD HELP US ALL.</span></span>`
                    },
                    'daisy_rabbit.log': {
                        type: 'file',
                        content: `<div class="ascii-art" style="font-size: 8px;">
      /\\ /\\
     /  \\  \\
    / /\\ \\ \\
   / /  \\ \\ \\
  /_/    \\_\\ \\
  \\ \\    / /
   \\ \\  / /
    \\_\\/_/
</div>
<span class="value">ENTRY 001: She was the first thing I saw when I returned. They took everything. But her... she was innocent.
<br><br>
<span class="blink-warning">THEY WILL PAY. UNTIL IT IS DONE.</span></span>`
                    },
                    'bfg_9000.schematic': {
                        type: 'file',
                        content: `<span class="header">>>> BFG-9000 PRIMARY CHARGE MODULE</span><br><span class="value">CAUTION: ARGENT ENERGY LEVELS > 50,000 U. DO NOT TOUCH.</span>`
                    }
                }
            },
            '.arasaka_mainframe': {
                type: 'dir',
                locked: !SAVED_STATE.arasakaHacked,
                visible: SAVED_STATE.arasakaHacked,
                id: 'arasakaHacked',
                securityLevel: 4,
                theme: 'cyberpunk',
                children: {
                    'SECURITY_INCIDENT_77.log': {
                        type: 'file',
                        content: `<span class="header">>>> ARASAKA COUNTER-INTEL [EYES ONLY]</span><br>
<span class="value">TARGET: V (UNKNOWN MERCENARY)<br>THREAT: EXTREME<br><br>
Adam Smasher reports contact. Target is utilizing military-grade Sandevistan. They are moving faster than our sensors can track.<br>
<span class="glitch-text">RELIC MALFUNCTION DETECTED... JOHNNY IS TAKING OVER...</span><br>
Backup required immediately at Arasaka Tower. This isn't just a runner... this is a Legend.</span>`
                    },
                    'silverhand.engram': {
                        type: 'file',
                        content: `<span class="glitch-text" style="color: var(--uac-grey);">[CORRUPTED DATA]</span> <span class="value">Wake the f**k up, Samurai. The corpos... they think they own us. They think they can bottle our souls. Burn it down. Burn it all down.</span>`
                    },
                    'relic_blueprint.dat': {
                        type: 'file',
                        content: `<span class="header">>>> SECURE RELIC BIOCHIP PROTOTYPE</span><br><span class="value">STATUS: EXPERIMENTAL. ENORMOUS FAILURE RATE DETECTED.</span>`
                    }
                }
            }
        }
    }
};

let currentPath = []; // Array of directory names, empty = root

// Helper to get current directory object
function getCurrentDir() {
    let dir = FILE_SYSTEM.root;
    for (const p of currentPath) {
        if (dir.children && dir.children[p]) {
            dir = dir.children[p];
        } else {
            return null;
        }
    }
    return dir;
}

// Commands
const COMMANDS = {
    help: {
        execute: () => {
            return `
<span class="header">AVAILABLE PROTOCOLS:</span>
<span class="key">help</span>              - ACCESS DATABASE
<span class="key">whoami</span>            - OPERATIVE PROFILE
<span class="key">ls [-a]</span>           - LIST DIRECTORY CONTENTS
<span class="key">cd [dir]</span>          - CHANGE DIRECTORY
<span class="key">pwd</span>               - PRINT WORKING DIRECTORY
<span class="key">cat [file]</span>        - READ FILE CONTENT
<span class="key">mkdir [dir]</span>       - CREATE DIRECTORY
<span class="key">touch [file]</span>      - DATA CREATION
<span class="key">history</span>           - COMMAND LOG
<span class="key">date</span>              - SYSTEM TIME
<span class="key">hack [dir/sys]</span>    - INITIATE BRUTE FORCE
<span class="key">theme [mode]</span>      - SWITCH UI MODE (doom | cyberpunk)
<span class="key">clear</span>             - FLUSH BUFFER
<span class="key">rip_and_tear</span>      - [WARNING] DO NOT INVOKE
`;
        }
    },
    ls: {
        execute: (args) => {
            const showHidden = args.includes('-a');
            const dir = getCurrentDir();
            if (!dir || !dir.children) return `<span class="value">Error: Invalid directory.</span>`;

            let files = Object.keys(dir.children);
            if (!showHidden) {
                files = files.filter(f => !f.startsWith('.') || dir.children[f].visible);
            }

            if (files.length === 0) return `<span class="value">[EMPTY]</span>`;

            return files.map(f => {
                const isDir = dir.children[f].type === 'dir';
                const isLocked = dir.children[f].locked;
                let style = isDir ? 'color: var(--primary-color); font-weight: bold;' : 'color: var(--text-color);';

                // Highlight previously hidden but now visible folders
                if (dir.children[f].visible && f.startsWith('.')) {
                    style += ' text-shadow: 0 0 5px var(--secondary-color);';
                }

                if (isLocked) style += ' opacity: 0.7;';
                const icon = isLocked ? '🔒 ' : (isDir ? '📁 ' : '📄 ');
                return `<span style="${style}">${icon}${f}</span>`;
            }).join('<br>');
        }
    },
    cd: {
        execute: (args) => {
            if (!args || args.length === 0) return `<span class="value">Usage: cd [directory]</span>`;
            let target = args[0];

            // Handle "cd.." typo or just robust parsing
            if (target === 'cd..') {
                target = '..';
            }

            if (target === '..') {
                if (currentPath.length > 0) {
                    currentPath.pop();
                    return null;
                } else {
                    return `<span class="value">Error: Already at root.</span>`;
                }
            }

            if (target === '-') {
                // Return to root for now as we don't track full history yet perfectly
                if (currentPath.length > 0) {
                    currentPath = [];
                    return null;
                } else {
                    return `<span class="value">Error: Already at root.</span>`;
                }
            }

            const dir = getCurrentDir();
            if (dir.children && dir.children[target]) {
                const targetNode = dir.children[target];
                if (targetNode.type !== 'dir') return `<span class="value">Error: Not a directory.</span>`;
                if (targetNode.locked) return `<span class="blink-warning" style="color: var(--primary-color);">ACCESS DENIED. ENCRYPTION LEVEL ${targetNode.securityLevel} DETECTED.<br>USE 'hack ${target}' TO BYPASS.</span>`;

                currentPath.push(target);
                return null;
            } else {
                return `<span class="value">Error: Directory not found.</span>`;
            }
        }
    },
    cat: {
        execute: (args) => {
            if (!args || args.length === 0) return `<span class="value">Usage: cat [file]</span>`;
            const target = args[0];
            const dir = getCurrentDir();

            if (dir.children && dir.children[target]) {
                const node = dir.children[target];
                if (node.type !== 'file') return `<span class="value">Error: Not a file.</span>`;
                return node.content;
            } else {
                return `<span class="value">Error: File not found.</span>`;
            }
        }
    },
    hack: {
        execute: (args) => {
            if (!args || args.length === 0) return `<span class="value">Usage: hack [target_directory]</span>`;
            const target = args[0];
            const dir = getCurrentDir();

            if (dir.children && dir.children[target]) {
                const node = dir.children[target];
                if (!node.locked) return `<span class="value">System already unlocked.</span>`;

                // Start Mini-Game
                startHackMiniGame(target, node);
                return null; // Game UI handles output
            }
            return `<span class="value">Target not found.</span>`;
        }
    },
    theme: {
        execute: (args) => {
            if (!args || args.length === 0) {
                return `<span class="value">Usage: <span class="key">theme [doom | cyberpunk]</span></span>`;
            }
            const mode = args[0].toLowerCase();
            setTheme(mode);
            return `<span class="key">>>> SYSTEM RELOADED: ${mode.toUpperCase()}_PROTOCOL</span>`;
        }
    },
    whoami: {
        execute: () => {
            return `
<span class="header">>>> OPERATIVE PROFILE: NOXY229</span>
<span class="key">ROLE:</span>      <span class="value">${USER_PROFILE.role}</span>
<span class="key">STATUS:</span>    <span class="value">${USER_PROFILE.status}</span>
<span class="key">LOC:</span>       <span class="value">${USER_PROFILE.location}</span>
<span class="key">AGE:</span>       <span class="value">${USER_PROFILE.age}</span>

<span class="header">>>> HARDWARE CONFIGURATION</span>
<span class="key">CPU:</span>       <span class="value">${USER_PROFILE.hardware.cpu}</span>
<span class="key">GPU:</span>       <span class="value">${USER_PROFILE.hardware.gpu}</span>
<span class="key">CHASSIS:</span>   <span class="value">${USER_PROFILE.hardware.case}</span>
<span class="key">VISUAL:</span>    <span class="value">${USER_PROFILE.hardware.displays}</span>
<span class="key">COMMS:</span>     <span class="value">${USER_PROFILE.hardware.mobile}</span>

<span class="header">>>> INTERESTS</span>
${USER_PROFILE.hobbies.map(h => `<span class="value">- ${h}</span>`).join('<br>')}`;
        }
    },
    clear: {
        execute: () => {
            outputElement.innerHTML = "";
            return null;
        }
    },
    banner: {
        execute: () => {
            const logo = currentTheme === 'cyberpunk' ? CYBERPUNK_LOGO : DOOM_LOGO;
            const subtext = currentTheme === 'cyberpunk' ? "WAKE UP SAMURAI. WE HAVE A CITY TO BURN." : "WELCOME SLAYER. AUTHORIZED PERSONNEL ONLY.";
            return `<div class="ascii-art blink-warning">${logo}</div><div>${subtext}</div>`;
        }
    },
    pwd: {
        execute: () => {
            const pathStr = currentPath.length === 0 ? '/' : '/' + currentPath.join('/');
            return `<span class="value">${pathStr}</span>`;
        }
    },
    date: {
        execute: () => {
            return `<span class="value">${new Date().toString()}</span>`;
        }
    },
    history: {
        execute: () => {
            return commandHistory.map((cmd, i) => `<span class="value">${i + 1}  ${cmd}</span>`).join('<br>');
        }
    },
    mkdir: {
        execute: (args) => {
            if (!args || args.length === 0) return `<span class="value">Usage: mkdir [directory]</span>`;
            const name = args[0];
            const dir = getCurrentDir();
            if (dir.children[name]) return `<span class="value">Error: File exists.</span>`;
            dir.children[name] = { type: 'dir', children: {} }; // Create virtual folder
            return null;
        }
    },
    touch: {
        execute: (args) => {
            if (!args || args.length === 0) return `<span class="value">Usage: touch [file]</span>`;
            const name = args[0];
            const dir = getCurrentDir();
            if (dir.children[name]) return null; // Update timestamp in real OS, here do nothing
            dir.children[name] = { type: 'file', content: '' }; // Create empty file
            return null;
        }
    },
    echo: {
        execute: (args) => {
            return `<span class="value">${args.join(' ')}</span>`;
        }
    },
    socials: {
        execute: () => {
            return `
<span class="header">>>> UPLINK ESTABLISHED</span>
<span class="key">GITHUB:</span>    <a href="https://github.com/noxy229" target="_blank" style="color: var(--secondary-color);">github.com/noxy229</a>
<span class="key">LINKEDIN:</span>  <a href="https://linkedin.com/in/noxy229" target="_blank" style="color: var(--secondary-color);">linkedin.com/in/noxy229</a>
`;
        }
    },
    rip_and_tear: {
        execute: () => {
            const audio = new Audio('https://www.myinstants.com/media/sounds/doom-eternal-rip-and-tear.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed (user interaction needed):", e));

            document.body.classList.add('rip-tear-mode');
            setTimeout(() => {
                document.body.classList.remove('rip-tear-mode');
            }, 6000);
            return `<span class="blink-warning" style="font-size: 2rem; font-family: var(--font-header); color: #ff0000; text-shadow: 2px 2px 0px #000;">${currentTheme === 'cyberpunk' ? 'CYBERPSYCHOSIS DETECTED' : 'UNTIL IT IS DONE.'}</span>`;
        }
    },
    idkfa: {
        execute: () => {
            return `<span class="key">>>> CHEAT CODE DETECTED</span><br><span class="value">ALL WEAPONS UNLOCKED. GOD MODE: ACTIVE.</span>`;
        }
    },
    slayer: {
        execute: () => {
            return `
<div class="ascii-art" style="font-size: 6px; line-height: 5px;">
       .               .
       |\\             /|
       | \\           / |
       |  \\_________/  |
      _|  |         |  |_
     / |  |         |  | \\
    /  |  |         |  |  \\
   /   |  |_________|  |   \\
  /    | /           \\ |    \\
 /_____|/             \\|_____\\
</div>
<span class="blink-warning" style="color: var(--primary-color);">WARNING: SLAYER THREAT LEVEL MAXIMAL</span>`;
        }
    }
};

function setTheme(mode) {
    if (mode === 'cyberpunk') {
        document.body.classList.add('cyberpunk');
        currentTheme = 'cyberpunk';
        updateStaticUI('cyberpunk');
    } else if (mode === 'doom') {
        document.body.classList.remove('cyberpunk');
        currentTheme = 'doom';
        updateStaticUI('doom');
    }
}

// Hacking Mini-Game
let isHacking = false;
let hackSequence = [];
let userHackInput = [];
let hackTargetNode = null;

function startHackMiniGame(targetName, node) {
    isHacking = true;
    hackTargetNode = node;
    inputElement.disabled = true;

    // Generate Sequence
    const length = node.securityLevel + 2;
    const chars = ['bd', '1c', '55', 'e9', 'ff', '7a'];
    let sequence = [];
    for (let i = 0; i < length; i++) sequence.push(chars[Math.floor(Math.random() * chars.length)]);
    hackSequence = sequence;
    userHackInput = [];

    // UI
    const gameId = 'hack-' + Date.now();
    const gameHTML = `
<div id="${gameId}" class="hack-interface" style="border: 1px dashed var(--primary-color); padding: 10px; margin: 10px 0;">
    <div class="header" style="color: var(--primary-color);">>>> BREACH PROTOCOL INITIATED: ${targetName.toUpperCase()}</div>
    <div style="margin: 10px 0;">Required Sequence: <span class="blink-warning" style="font-weight: bold; color: var(--secondary-color);">${sequence.join(' ')}</span></div>
    <div class="hack-buffer">Buffer: <span id="${gameId}-buffer"></span></div>
    <div class="hack-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-top: 10px;">
        ${chars.map(c => `<button onclick="handleHackInput('${c}', '${gameId}')" style="background: transparent; border: 1px solid var(--uac-grey); color: var(--text-color); cursor: pointer; padding: 5px;" class="hack-btn">${c}</button>`).join('')}
    </div>
    <div style="margin-top: 10px; font-size: 0.8rem; color: var(--uac-grey);">CLICK TO INPUT. SEQUENCE MATCH REQUIRED.</div>
</div>`;

    printOutput(gameHTML);

    // Expose handler
    window.handleHackInput = (char, id) => {
        if (!isHacking) return;
        userHackInput.push(char);
        document.getElementById(`${id}-buffer`).textContent = userHackInput.join(' ');

        // Check
        if (userHackInput.length === hackSequence.length) {
            if (userHackInput.join('') === hackSequence.join('')) {
                // Success
                hackTargetNode.locked = false;
                hackTargetNode.visible = true; // Make visible permanently

                // SAVE STATE
                if (hackTargetNode.id) {
                    SAVED_STATE[hackTargetNode.id] = true;
                    saveGameState();
                }

                document.getElementById(id).innerHTML += `<br><span class="key" style="color: #00ff00;">>>> ACCESS GRANTED. LOCK REMOVED.</span>`;
                isHacking = false;
                inputElement.disabled = false;
                inputElement.focus();

                if (hackTargetNode.theme) {
                    setTheme(hackTargetNode.theme);
                    printOutput(`<span class="blink-warning">WARNING: RESTRICTED ENVIRONMENT DETECTED. SYSTEM THEME ADAPTED.</span>`);
                }

                // Trigger Achievement if it's the first time
                if (!hackTargetNode.achievementUnlocked && !SAVED_STATE.achievementUnlocked) {
                    showAchievement();
                    hackTargetNode.achievementUnlocked = true;
                    SAVED_STATE.achievementUnlocked = true;
                    saveGameState(); // Save achievement state
                }
            } else {
                // Fail
                document.getElementById(id).innerHTML += `<br><span class="blink-warning" style="color: red;">>>> BREACH FAILED. ALARM TRIGGERED.</span>`;
                isHacking = false;
                inputElement.disabled = false;
                inputElement.focus();
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 1000);
            }
        }
    };
}

function updateStaticUI(theme) {
    const titleEl = document.querySelector('.terminal-header .title');
    const uacLogoEl = document.querySelector('.uac-logo');
    const currentPromptSpan = document.querySelector('.input-line .prompt');
    const footerEl = document.querySelector('.terminal-footer');

    const pathStr = currentPath.length === 0 ? '~' : '~/' + currentPath.join('/');

    if (theme === 'cyberpunk') {
        uacLogoEl.textContent = 'ARASAKA';
        titleEl.innerHTML = `NEURAL_LINK: <span class="blink-warning">CONNECTED</span> // ID: noxy229`;
        currentPromptSpan.textContent = `[CP77] noxy229@night-city:${pathStr}$`;
        footerEl.innerHTML = `<span>ARASAKA CORPORATION</span><span>NIGHT CITY NET</span>`;
    } else {
        uacLogoEl.textContent = 'UAC';
        titleEl.innerHTML = `SYSTEM STATUS: <span class="blink-warning">CRITICAL</span> // ID: noxy229`;
        currentPromptSpan.textContent = `[UAC] noxy229@mars-base:${pathStr}$`;
        footerEl.innerHTML = `<span>UNION AEROSPACE CORPORATION</span><span>LEVEL 5 CLEARANCE</span>`;
    }
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    printOutput(COMMANDS.banner.execute());
    inputElement.focus();
    updateStaticUI(currentTheme);
});

// Focus
document.addEventListener('click', () => {
    if (!isHacking) inputElement.focus();
});

// Input
inputElement.addEventListener('keydown', (e) => {
    if (isHacking) {
        e.preventDefault();
        return;
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        const currentInput = inputElement.value.trim().toLowerCase();
        if (currentInput) {
            const validCommands = Object.keys(COMMANDS);
            const matches = validCommands.filter(cmd => cmd.startsWith(currentInput));
            if (matches.length === 1) {
                inputElement.value = matches[0];
            } else {
                const parts = currentInput.split(' ');
                if (parts.length === 2) {
                    const dir = getCurrentDir();
                    if (dir && dir.children) {
                        const fileMatches = Object.keys(dir.children).filter(f => f.startsWith(parts[1]));
                        if (fileMatches.length === 1) {
                            inputElement.value = parts[0] + ' ' + fileMatches[0];
                        }
                    }
                }
            }
        }
    } else if (e.key === 'Enter') {
        const commandText = inputElement.value.trim();
        if (commandText) {
            const [cmd, ...args] = commandText.split(' ');
            processCommand(cmd, args);
            commandHistory.push(commandText);
            historyIndex = commandHistory.length;
            inputElement.value = "";
        }
        scrollToBottom();
    } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
            historyIndex--;
            inputElement.value = commandHistory[historyIndex];
        }
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            inputElement.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            inputElement.value = "";
        }
        e.preventDefault();
    }
});

function processCommand(cmd, args) {
    // 1. Echo
    const pathStr = currentPath.length === 0 ? '~' : '~/' + currentPath.join('/');
    const promptText = currentTheme === 'cyberpunk' ? `[CP77] noxy229@night-city:${pathStr}$` : `[UAC] noxy229@mars-base:${pathStr}$`;
    const promptSpan = document.createElement('div');
    promptSpan.className = 'output-line';
    promptSpan.innerHTML = `<span class="prompt">${promptText}</span> <span class="command-executed">${cmd} ${args.join(' ')}</span>`;
    outputElement.appendChild(promptSpan);

    // 2. Execute
    const lowerCmd = cmd.toLowerCase();

    if (COMMANDS[lowerCmd]) {
        const result = COMMANDS[lowerCmd].execute(args);
        if (result !== null) {
            printOutput(result);
        }
        updateStaticUI(currentTheme);
    } else {
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 500);

        printOutput(`<span style="color: var(--primary-color);">ERROR: UNKNOWN PROTOCOL [${cmd}]</span>. TYPE <span class="key">HELP</span>.`);
    }
}

function printOutput(htmlContent) {
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output-line output-content';
    outputDiv.innerHTML = htmlContent;
    outputElement.appendChild(outputDiv);
    scrollToBottom();
}

function showAchievement() {
    const popup = document.getElementById('achievement-popup');
    const sound = new Audio('https://www.myinstants.com/media/sounds/xbox-achievement.mp3');
    sound.volume = 0.5;
    sound.play().catch(e => console.log("Audio failed:", e));

    popup.classList.add('show');

    // Confetti Logic
    if (!window.confetti) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
        script.onload = () => {
            triggerConfettiBurst();
        };
        document.body.appendChild(script);
    } else {
        triggerConfettiBurst();
    }

    setTimeout(() => {
        popup.classList.remove('show');
    }, 8000);
}

function triggerConfettiBurst() {
    var end = Date.now() + (3 * 1000);
    var colors = ['#ff0000', '#ffffff'];

    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

function scrollToBottom() {
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
}
