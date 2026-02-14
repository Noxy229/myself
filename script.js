const outputElement = document.getElementById('output');
const inputElement = document.getElementById('command-input');
const terminalWindow = document.getElementById('terminal-window');
const terminalContainer = document.querySelector('.terminal-container');
const bodyElement = document.body;

// Sound Effects (Optional - browsers block auto-play, so we'll just prep logic)
// const soundKeypress = new Audio('keypress.mp3');

// User Data
const USER_PROFILE = {
    role: "Fachinformatiker Systemintegration", // Apprentice
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

const DOOM_LOGO = `
    ____  ____  ____  __  __ 
   |  _ \\|  _ \\|  _ \\|  \\/  |
   | | | | | | | | | | |\\/| |
   | |_| | |_| | |_| | |  | |
   |____/|____/|____/|_|  |_|
                             
   ETERNAL // PORTFOLIO SYSTEM
`;

// Commands
const COMMANDS = {
    help: {
        execute: () => {
            return `
<span class="header">AVAILABLE PROTOCOLS:</span>
<span class="key">help</span>         - ACCESS HELP DATABASE
<span class="key">whoami</span>       - DISPLAY OPERATIVE PROFILE
<span class="key">clear</span>        - FLUSH TERMINAL BUFFER
<span class="key">banner</span>       - RELOAD UAC HEADER
<span class="key">socials</span>      - ESTABLISH UP-LINK
<span class="key">rip_and_tear</span> - [WARNING] DO NOT INVOKE
`;
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
            return `<div class="ascii-art blink-warning">${DOOM_LOGO}</div><div>WELCOME SLAYER. AUTHORIZED PERRSONNEL ONLY.</div>`;
        }
    },
    socials: {
        execute: () => {
            return `
<span class="header">>>> UPLINK ESTABLISHED</span>
<span class="key">GITHUB:</span>    <a href="https://github.com/noxy229" target="_blank" style="color: var(--argent-orange);">github.com/noxy229</a>
<span class="key">LINKEDIN:</span>  <a href="https://linkedin.com/in/noxy229" target="_blank" style="color: var(--argent-orange);">linkedin.com/in/noxy229</a>
`;
        }
    },
    rip_and_tear: {
        execute: () => {
            document.body.classList.add('rip-tear-mode');
            setTimeout(() => {
                document.body.classList.remove('rip-tear-mode');
            }, 5000);
            return `<span class="blink-warning" style="font-size: 2rem; font-family: var(--font-header); color: #ff0000;">UNTIL IT IS DONE.</span>`;
        }
    }
};

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    printOutput(COMMANDS.banner.execute());
    inputElement.focus();
});

// Focus
document.addEventListener('click', () => {
    inputElement.focus();
});

// Input
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const commandText = inputElement.value.trim();
        if (commandText) {
            processCommand(commandText);
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

function processCommand(cmd) {
    // 1. Echo
    const promptSpan = document.createElement('div');
    promptSpan.className = 'output-line';
    promptSpan.innerHTML = `<span class="prompt">[UAC] noxy229@mars-base:~$</span> <span class="command-executed">${cmd}</span>`;
    outputElement.appendChild(promptSpan);

    // 2. Execute
    const lowerCmd = cmd.toLowerCase();

    if (COMMANDS[lowerCmd]) {
        const result = COMMANDS[lowerCmd].execute();
        if (result !== null) {
            printOutput(result);
        }
    } else {
        printOutput(`<span style="color: var(--primary-red);">ERROR: UNKNOWN PROTOCOL [${cmd}]</span>. TYPE <span class="key">HELP</span>.`);
    }
}

function printOutput(htmlContent) {
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output-line output-content';
    outputDiv.innerHTML = htmlContent;
    outputElement.appendChild(outputDiv);
    scrollToBottom();
}

function scrollToBottom() {
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
}
