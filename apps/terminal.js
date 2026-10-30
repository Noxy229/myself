/* Lennox_OS terminal: classic JavaScript, virtual filesystem only. */
(() => {
    'use strict';
    const os = window.LennoxOS;
    const home = '/home/lennox';
    const bootTime = Date.now();
    const appIds = ['terminal', 'files', 'trash', 'editor', 'imageviewer', 'settings', 'btop', 'browser', 'snake', 'minesweeper', 'calculator', 'paint', 'homelab', 'profile', 'projects'];
    const commands = ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'tree', 'head', 'tail', 'grep', 'wc', 'clear', 'history', 'whoami', 'hostname', 'date', 'uptime', 'uname', 'neofetch', 'open', 'nano', 'vim', 'code', 'firefox', 'htop', 'top', 'sudo', 'apt', 'pacman', 'ping', 'ssh', 'cowsay', 'sl', 'matrix', 'fortune', 'exit', ...appIds];
    const MAX_OUTPUT = 160000;
    const parent = path => path.slice(0, path.lastIndexOf('/')) || '/';
    const basename = path => path.split('/').pop() || '/';
    const encoder = new TextEncoder();

    function resolvePath(value, cwd) {
        if (typeof value !== 'string' || value.includes('\0') || value.length > 2048) throw new Error('invalid path');
        let path = value === '~' ? home : value.startsWith('~/') ? home + value.slice(1) : value;
        if (!path.startsWith('/')) path = cwd + '/' + path;
        const parts = [];
        for (const part of path.split('/')) {
            if (part === '..') parts.pop();
            else if (part && part !== '.') parts.push(part);
        }
        path = '/' + parts.join('/');
        if (path.length > 2048) throw new Error('path is too long');
        return path;
    }

    // Operators retain their identity, so quoted pipes and redirects stay text.
    function tokenize(source) {
        const tokens = [];
        let word = '', started = false, quote = '';
        const flush = () => {
            if (started) tokens.push({ word });
            word = ''; started = false;
        };
        for (let i = 0; i < source.length; i++) {
            const c = source[i];
            if (c === '\\' && quote !== "'") {
                if (i + 1 >= source.length) throw new Error('unfinished escape');
                const next = source[i + 1];
                if (quote === '"' && !['"', '\\', '$', '`'].includes(next)) word += '\\';
                word += next; i++; started = true;
            } else if (quote) {
                if (c === quote) quote = ''; else word += c;
            } else if (c === '"' || c === "'") {
                quote = c; started = true;
            } else if (/\s/.test(c)) flush();
            else if (';&|>'.includes(c)) {
                flush();
                let op = c;
                if (source[i + 1] === c && '&|>'.includes(c)) { op += c; i++; }
                if (op === '&' || op === '||') throw new Error('only ;, &&, |, > and >> are supported');
                tokens.push({ op });
            } else { word += c; started = true; }
        }
        if (quote) throw new Error('unclosed quote');
        flush();
        if (tokens.length > 1000) throw new Error('too many arguments');
        return tokens;
    }

    function parse(source) {
        const tokens = tokenize(source);
        const groups = [];
        let pipeline = [], argv = [], redirect = null, gate = ';';
        const stage = () => {
            if (!argv.length) throw new Error('expected a command');
            pipeline.push({ argv, redirect }); argv = []; redirect = null;
        };
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!token.op) { argv.push(token.word); continue; }
            if (token.op === '>' || token.op === '>>') {
                if (redirect || !tokens[i + 1] || tokens[i + 1].op) throw new Error('expected one redirection filename');
                redirect = { append: token.op === '>>', path: tokens[++i].word };
            } else if (token.op === '|') stage();
            else {
                stage(); groups.push({ gate, pipeline }); pipeline = []; gate = token.op;
            }
        }
        if (argv.length) { stage(); groups.push({ gate, pipeline }); }
        else if (pipeline.length || redirect || gate === '&&') throw new Error('expected a command');
        return groups;
    }

    if (!document.getElementById('app-terminal-style')) {
        const style = document.createElement('style');
        style.id = 'app-terminal-style';
        style.textContent = `
.lx-terminal{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--window-bg);color:var(--text-bright);font:13px/1.55 'Courier New',monospace;user-select:text;-webkit-user-select:text;cursor:text}
.lx-terminal .lx-term-bar{flex:none;display:flex;justify-content:space-between;gap:12px;padding:7px 14px;border-bottom:1px solid var(--window-border);font-size:11px;color:var(--text-dim);user-select:none}
.lx-terminal .lx-term-session{color:var(--accent)}
.lx-terminal .lx-term-screen{flex:1;min-height:0;overflow:auto;padding:12px 14px;scrollbar-color:var(--window-border) transparent}
.lx-terminal .lx-term-line{white-space:pre-wrap;overflow-wrap:anywhere;min-height:1.55em;margin:0;font:inherit}
.lx-terminal .lx-term-muted{color:var(--text-dim)}
.lx-terminal .lx-term-accent,.lx-terminal .lx-term-user{color:var(--accent)}
.lx-terminal .lx-term-path,.lx-terminal .lx-term-folder{color:color-mix(in srgb,var(--accent) 45%,var(--text-bright));font-weight:bold}
.lx-terminal .lx-term-error{color:var(--accent)}
.lx-terminal .lx-term-inputrow{display:flex;align-items:baseline;gap:8px;min-height:1.55em}
.lx-terminal .lx-term-prompt{white-space:pre-wrap;flex:none}
.lx-terminal .lx-term-edit{position:relative;flex:1;min-width:2ch}
.lx-terminal .lx-term-input{display:block;width:100%;height:1.55em;line-height:1.55;padding:0;border:0;border-radius:0;background:transparent;color:var(--text-bright);font:inherit;caret-color:transparent;outline:none;box-shadow:none}
.lx-terminal .lx-term-input:focus-visible{outline:none}
.lx-terminal .lx-term-cursor{position:absolute;top:.15em;width:1ch;height:1.25em;background:var(--text-bright);opacity:.65;pointer-events:none;animation:lx-term-blink 1.1s step-end infinite}
.lx-terminal .lx-term-edit:not(:focus-within) .lx-term-cursor{display:none}
.lx-terminal .lx-term-password .lx-term-cursor{left:0!important}
.lx-terminal .lx-term-animation{color:var(--accent);white-space:pre;overflow:hidden;font:inherit;margin:0}
@keyframes lx-term-blink{50%{opacity:0}}
@media(prefers-reduced-motion:reduce){.lx-terminal .lx-term-cursor{animation:none}}
@media(max-width:480px){.lx-terminal{font-size:12px}.lx-terminal .lx-term-screen{padding:10px 8px}.lx-terminal .lx-term-bar{padding:6px 8px}.lx-terminal .lx-term-bar span:last-child{display:none}}
`;
        document.head.append(style);
    }

    os.registerApp({
        id: 'terminal', title: 'Terminal', desktop: true, startMenu: true, multiInstance: true,
        defaultSize: { w: 720, h: 440 }, minSize: { w: 340, h: 240 },
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 3 4 4-4 4-1.4-1.4L8.2 12 5.6 9.4 7 8zm5 7h5v2h-5v-2z"/></svg>',
        onOpen(ctx) {
            const fs = os.fs;
            let cwd = fs.get(home)?.type === 'folder' ? home : '/';
            try {
                if (typeof ctx.args?.cwd === 'string') {
                    const requested = resolvePath(ctx.args.cwd, cwd);
                    if (fs.get(requested)?.type === 'folder') cwd = requested;
                }
            } catch (_) { /* Invalid launch coordinates retain the home directory. */ }
            let previous = cwd, remote = false, remoteCwd = '/root', closed = false, busy = false;
            let active = null, generation = 0, historyIndex = 0, draft = '', lastTab = '';
            const history = [], timers = new Set();
            const root = node('div', 'lx-terminal');
            const bar = node('div', 'lx-term-bar');
            const session = node('span', 'lx-term-session', '● lennox-sh');
            bar.append(session, node('span', '', 'virtual session · Ctrl+L clear · Tab complete'));
            const screen = node('div', 'lx-term-screen');
            screen.setAttribute('aria-label', 'Terminal scrollback');
            const output = node('div', 'lx-term-output');
            output.setAttribute('role', 'log'); output.setAttribute('aria-live', 'polite');
            const row = node('div', 'lx-term-inputrow');
            const prompt = node('span', 'lx-term-prompt');
            const edit = node('div', 'lx-term-edit');
            const input = node('input', 'lx-term-input');
            input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false;
            input.setAttribute('autocapitalize', 'off'); input.setAttribute('aria-label', 'Terminal command');
            input.maxLength = 8192;
            const cursor = node('span', 'lx-term-cursor'); cursor.setAttribute('aria-hidden', 'true');
            edit.append(input, cursor); row.append(prompt, edit); screen.append(output, row); root.append(bar, screen);
            ctx.body.style.padding = '0'; ctx.body.style.overflow = 'hidden'; ctx.body.append(root);

            function node(tag, className, text) {
                const element = document.createElement(tag); element.className = className;
                if (text !== undefined) element.textContent = text;
                return element;
            }
            function scroll() { if (!closed) screen.scrollTop = screen.scrollHeight; }
            function print(text = '', className = '') {
                if (closed || text === '') return;
                const line = node('div', 'lx-term-line ' + className, String(text).slice(0, MAX_OUTPUT));
                output.append(line);
                while (output.childNodes.length > 700 || (output.childNodes.length > 1 && output.textContent.length > 300000)) output.firstChild.remove();
                scroll();
            }
            function displayCwd() {
                const path = remote ? remoteCwd : cwd;
                return !remote && (path === home || path.startsWith(home + '/')) ? '~' + path.slice(home.length) : path;
            }
            function makePrompt() {
                const fragment = document.createDocumentFragment();
                fragment.append(node('span', 'lx-term-user', remote ? 'root@proxmox' : 'lennox@lennox-os'));
                fragment.append(document.createTextNode(':'));
                fragment.append(node('span', 'lx-term-path', displayCwd()));
                fragment.append(document.createTextNode(remote ? '#' : '$'));
                return fragment;
            }
            function updatePrompt() {
                prompt.replaceChildren(makePrompt());
                session.textContent = remote ? '● ssh · proxmox (simulated)' : '● lennox-sh';
                ctx.setTitle((remote ? 'root@proxmox' : 'lennox@lennox-os') + ': ' + displayCwd() + ' — Terminal');
            }
            function echoCommand(text, suffix = '') {
                const line = node('div', 'lx-term-line');
                line.append(makePrompt(), document.createTextNode(' ' + text + suffix + '\n')); output.append(line); scroll();
            }
            function cursorPosition() {
                const position = input.type === 'password' ? 0 : input.selectionStart || 0;
                cursor.style.left = `calc(${position}ch - ${input.scrollLeft}px)`;
            }
            function focus() { if (!closed) { input.focus({ preventScroll: true }); cursorPosition(); } }
            function clearTimers() { for (const id of timers) clearTimeout(id); timers.clear(); }
            function later(fn, ms) {
                const id = setTimeout(() => { timers.delete(id); if (!closed) fn(); }, ms);
                timers.add(id); return id;
            }
            function interactive(start, end) {
                return new Promise(resolve => {
                    let finished = false;
                    const finish = canceled => {
                        if (finished) return;
                        finished = true; clearTimers(); active = null;
                        input.type = 'text'; edit.classList.remove('lx-term-password'); input.value = '';
                        input.setAttribute('aria-label', 'Terminal command');
                        updatePrompt();
                        if (!closed && end) end(canceled);
                        resolve({ text: '', status: canceled ? 130 : 0 });
                    };
                    active = { cancel: () => finish(true), finish: () => finish(false), key: null, submit: null };
                    start(active, later);
                });
            }
            function error(message) { return { text: '', error: message + '\n', status: 1 }; }
            const ok = (text = '') => ({ text, status: 0 });
            const pathOf = value => resolvePath(value, cwd);
            function readFiles(paths, stdin, command) {
                if (!paths.length) {
                    if (stdin !== null) return stdin;
                    throw new Error(command + ': missing file operand');
                }
                return paths.map(value => {
                    if (value === '-' && stdin !== null) return stdin;
                    const data = fs.read(pathOf(value));
                    if (data === null) throw new Error(command + ': ' + value + ': not a readable file');
                    return data;
                }).join('');
            }
            function options(args, allowed, needsValue = []) {
                const flags = new Set(), operands = [];
                let count = 10, literal = false;
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i];
                    if (!literal && arg === '--') { literal = true; continue; }
                    if (!literal && arg.startsWith('-') && arg !== '-') {
                        if (/^-\d+$/.test(arg) && needsValue.includes('n')) { count = Number(arg.slice(1)); continue; }
                        for (const flag of arg.slice(1)) {
                            if (!allowed.includes(flag)) throw new Error('unsupported option: -' + flag);
                            flags.add(flag);
                            if (needsValue.includes(flag)) {
                                const value = args[++i];
                                if (!/^\d+$/.test(value || '')) throw new Error('option -' + flag + ' needs a non-negative number');
                                count = Number(value);
                            }
                        }
                    } else operands.push(arg);
                }
                return { flags, operands, count: Math.min(count, 10000) };
            }
            function copy(source, destination, recursive) {
                const entry = fs.get(source);
                if (!entry) throw new Error('cp: source does not exist');
                if (source === destination || destination.startsWith(source === '/' ? '/' : source + '/')) throw new Error('cp: cannot copy a path into itself');
                if (entry.type === 'folder' && !recursive) throw new Error('cp: directory requires -r');
                // Preflight limits avoid an unbounded walk and catch type conflicts before writes.
                const pending = [{ from: source, to: destination }], plan = [];
                for (let i = 0; i < pending.length; i++) {
                    if (pending.length > 2000) throw new Error('cp: tree exceeds 2000 entries');
                    const item = pending[i], current = fs.get(item.from), target = fs.get(item.to);
                    if (target && (target.type !== current.type || current.type === 'folder')) throw new Error('cp: destination already exists');
                    plan.push({ ...item, entry: current });
                    if (current.type === 'folder') for (const child of fs.list(item.from) || []) pending.push({ from: child.path, to: item.to + '/' + child.name });
                }
                for (const item of plan) {
                    const success = item.entry.type === 'folder' ? fs.mkdir(item.to) : fs.write(item.to, item.entry.content);
                    if (!success) throw new Error('cp: could not write ' + item.to);
                }
            }

            async function execute(argv, stdin, streaming) {
                const [command, ...args] = argv;
                try {
                    if (remote) return remoteCommand(command, args);
                    switch (command) {
                    case 'help': return ok(
                        'lennox-sh — a browser-local shell on LennoxOS.fs\n' +
                        'Files   ls [-la] · cd [path] · pwd · cat · touch · mkdir [-p]\n' +
                        '        rm [-rf] · mv source dest · cp [-r] source dest · tree\n' +
                        'Text    echo [-n] · head/tail [-n N] · grep [-inv] pattern file\n' +
                        '        wc [-lwc] · grep uses literal text (not regex)\n' +
                        '        > overwrite · >> append · | text filters\n' +
                        'System  whoami · hostname · date · uptime · uname -a · neofetch\n' +
                        'Apps    open path · nano/vim/code file · firefox · htop · top\n' +
                        '        ' + appIds.join(' · ') + '\n' +
                        'Extras  sudo · apt/pacman install · ping [-c N] host · ssh proxmox\n' +
                        '        cowsay · fortune · sl · matrix · exit\n' +
                        'Shell   help · history · clear · && · ; · quoted paths · ~\n' +
                        'Keys    ↑/↓ history · Tab complete (twice: choices) · Ctrl+C cancel\n' +
                        '        Ctrl+L clear · select text to copy normally\n' +
                        'Network, packages and SSH are simulated; files persist in this browser.\n');
                    case 'pwd': return ok(cwd + '\n');
                    case 'cd': {
                        if (args.length > 1) return error('cd: too many arguments');
                        const target = args[0] === '-' ? previous : pathOf(args[0] || '~');
                        if (fs.get(target)?.type !== 'folder') return error('cd: ' + (args[0] || '~') + ': not a directory');
                        previous = cwd; cwd = target; updatePrompt();
                        return ok(args[0] === '-' ? cwd + '\n' : '');
                    }
                    case 'ls': {
                        const { flags, operands } = options(args, 'la');
                        let text = ''; const rich = [];
                        const paths = operands.length ? operands : ['.'];
                        for (const value of paths) {
                            const entry = fs.get(pathOf(value));
                            if (!entry) return error('ls: ' + value + ': no such file or directory');
                            const children = entry.type === 'folder' ? fs.list(entry.path) : [entry];
                            if (flags.has('a') && entry.type === 'folder') children.unshift({ ...entry, name: '.' }, { ...fs.get(parent(entry.path)), name: '..' });
                            if (paths.length > 1) { text += value + ':\n'; rich.push({ text: value + ':\n' }); }
                            for (const child of children.filter(item => flags.has('a') || !item.name.startsWith('.'))) {
                                const label = child.name + (child.type === 'folder' ? '/' : '');
                                const prefix = flags.has('l') ? (child.type === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--') + '  lennox lennox ' + String(child.content?.length || 0).padStart(7) + ' ' + new Date(child.modified).toLocaleDateString('en-GB') + '  ' : '';
                                text += prefix + label + (flags.has('l') ? '\n' : '  ');
                                rich.push({ text: prefix }, { text: label, className: child.type === 'folder' ? 'lx-term-folder' : '' }, { text: flags.has('l') ? '\n' : '  ' });
                            }
                            if (!flags.has('l')) { text += '\n'; rich.push({ text: '\n' }); }
                        }
                        return { ...ok(text), rich };
                    }
                    case 'cat': return ok(readFiles(args, stdin, 'cat'));
                    case 'echo': {
                        const noNewline = args[0] === '-n';
                        return ok((noNewline ? args.slice(1) : args).join(' ') + (noNewline ? '' : '\n'));
                    }
                    case 'touch': {
                        if (!args.length) return error('touch: missing file operand');
                        for (const value of args) {
                            const path = pathOf(value), entry = fs.get(path);
                            if (entry?.type === 'folder') continue;
                            if (!fs.write(path, entry?.content || '')) return error('touch: cannot create ' + value);
                        }
                        return ok();
                    }
                    case 'mkdir': {
                        const { flags, operands } = options(args, 'p');
                        if (!operands.length) return error('mkdir: missing directory operand');
                        for (const value of operands) {
                            const path = pathOf(value);
                            if (flags.has('p')) {
                                let current = '';
                                for (const part of path.split('/').filter(Boolean)) {
                                    current += '/' + part;
                                    if (fs.get(current)?.type === 'folder') continue;
                                    if (!fs.mkdir(current)) return error('mkdir: cannot create ' + current);
                                }
                            } else if (!fs.mkdir(path)) return error('mkdir: cannot create ' + value + ' (exists or parent missing)');
                        }
                        return ok();
                    }
                    case 'rm': {
                        const { flags, operands } = options(args, 'rfR');
                        if (!operands.length) return flags.has('f') ? ok() : error('rm: missing operand');
                        for (const value of operands) {
                            const path = pathOf(value), entry = fs.get(path);
                            if (path === '/') return error('rm: nice try. The desktop would like to remain employed. / stays.');
                            if (!entry && flags.has('f')) continue;
                            if (!entry) return error('rm: ' + value + ': no such file or directory');
                            if (entry.type === 'folder' && !flags.has('r') && !flags.has('R')) return error('rm: ' + value + ': is a directory (use -r)');
                            if (!fs.remove(path)) return error('rm: could not remove ' + value);
                        }
                        return ok();
                    }
                    case 'mv': case 'cp': {
                        const { flags, operands } = options(args, command === 'cp' ? 'rR' : '');
                        if (operands.length !== 2) return error(command + ': expected source and destination');
                        const from = pathOf(operands[0]); let to = pathOf(operands[1]);
                        if (fs.get(to)?.type === 'folder') to = (to === '/' ? '' : to) + '/' + basename(from);
                        if (command === 'cp') copy(from, to, flags.has('r') || flags.has('R'));
                        else if (!fs.rename(from, to)) return error('mv: failed (source missing, destination exists, or invalid move)');
                        if (command === 'mv' && (cwd === from || cwd.startsWith(from + '/'))) { cwd = to + cwd.slice(from.length); updatePrompt(); }
                        return ok();
                    }
                    case 'tree': {
                        if (args.length > 1) return error('tree: expected at most one path');
                        const path = pathOf(args[0] || '.');
                        if (fs.get(path)?.type !== 'folder') return error('tree: not a directory');
                        const lines = [args[0] || '.']; let directories = 0, files = 0;
                        const stack = [{ path, prefix: '' }];
                        while (stack.length && lines.length < 1500) {
                            const item = stack.pop();
                            if (item.label) lines.push(item.label);
                            const children = fs.list(item.path);
                            if (!children) continue;
                            for (let i = children.length - 1; i >= 0; i--) {
                                const child = children[i], last = i === children.length - 1;
                                if (child.type === 'folder') directories++; else files++;
                                stack.push({ path: child.path, prefix: item.prefix + (last ? '    ' : '│   '), label: item.prefix + (last ? '└── ' : '├── ') + child.name + (child.type === 'folder' ? '/' : '') });
                            }
                        }
                        if (stack.length) lines.push('… tree truncated at 1500 entries');
                        return ok(lines.join('\n') + '\n\n' + directories + ' directories, ' + files + ' files\n');
                    }
                    case 'head': case 'tail': {
                        const { operands, count } = options(args, 'n', ['n']);
                        const data = readFiles(operands, stdin, command), lines = data.split('\n');
                        if (lines.at(-1) === '') lines.pop();
                        const selected = command === 'head' ? lines.slice(0, count) : count ? lines.slice(-count) : [];
                        return ok(selected.join('\n') + (selected.length ? '\n' : ''));
                    }
                    case 'grep': {
                        const { flags, operands } = options(args, 'inv');
                        if (!operands.length) return error('grep: expected pattern [file…]');
                        const pattern = operands.shift();
                        if (pattern.length > 512) return error('grep: pattern too long');
                        // Literal matching avoids blocking the UI on hostile regular expressions.
                        const needle = flags.has('i') ? pattern.toLocaleLowerCase() : pattern;
                        const sources = operands.length ? operands : [null];
                        if (!operands.length && stdin === null) return error('grep: expected a file or pipe');
                        const matches = [];
                        for (const source of sources) {
                            const data = source === null ? stdin : readFiles([source], stdin, 'grep');
                            const lines = data.split('\n'); if (lines.at(-1) === '') lines.pop();
                            lines.forEach((line, index) => {
                                const found = (flags.has('i') ? line.toLocaleLowerCase() : line).includes(needle);
                                if (found !== flags.has('v')) matches.push((sources.length > 1 ? source + ':' : '') + (flags.has('n') ? index + 1 + ':' : '') + line);
                            });
                        }
                        return { text: matches.join('\n') + (matches.length ? '\n' : ''), status: matches.length ? 0 : 1 };
                    }
                    case 'wc': {
                        const { flags, operands } = options(args, 'lwc');
                        const sources = operands.length ? operands : [null], totals = [0, 0, 0], lines = [];
                        for (const source of sources) {
                            const data = source === null ? readFiles([], stdin, 'wc') : readFiles([source], stdin, 'wc');
                            const counts = [(data.match(/\n/g) || []).length, (data.match(/\S+/g) || []).length, encoder.encode(data).length];
                            counts.forEach((value, i) => { totals[i] += value; });
                            lines.push(format(counts) + (source === null ? '' : ' ' + source));
                        }
                        if (sources.length > 1) lines.push(format(totals) + ' total');
                        return ok(lines.join('\n') + '\n');
                        function format(counts) { return counts.filter((_, i) => !flags.size || flags.has('lwc'[i])).map(value => String(value).padStart(6)).join(' '); }
                    }
                    case 'clear': output.replaceChildren(); return ok();
                    case 'history': return ok(history.map((line, i) => String(i + 1).padStart(4) + '  ' + line).join('\n') + '\n');
                    case 'whoami': return ok('lennox\n');
                    case 'hostname': return ok('lennox-os\n');
                    case 'date': return ok(new Date().toString() + '\n');
                    case 'uptime': return ok(' up ' + Math.floor((Date.now() - bootTime) / 60000) + ' min, 1 user, load average: 0.13, 0.06, 0.02 (simulated)\n');
                    case 'uname': return ok(args.includes('-a') ? 'Lennox_OS lennox-os 6.8.0-lennox #1 SMP x86_64 GNU/Lennox (virtual)\n' : 'Lennox_OS\n');
                    case 'neofetch': return {
                        ...ok([
                            '       __       Lennox@lennox-os',
                            '      / /       ------------------------------',
                            '     / /        OS: Lennox_OS',
                            '    / /         Owner: Lennox',
                            '   / /____      Role: Fachinformatiker Systemintegration apprentice',
                            '  /_______/     Location: Niedersachsen',
                            '    / /         CPU: Intel i5-13600KF',
                            '   / /___       GPU: AMD Radeon RX 9070 XT',
                            '  /_____/       Case: Hyte Y60',
                            '                Displays: 3x LG displays',
                            '                Phone: OnePlus 12',
                            '                Shell: lennox-sh',
                            '                DE: Lennox_OS',
                            '                Uptime: ' + Math.floor((Date.now() - bootTime) / 60000) + ' minutes',
                            '                Terminal: browser / virtual filesystem', ''
                        ].join('\n')), className: 'lx-term-accent'
                    };
                    case 'open': {
                        if (args.length !== 1) return error('open: expected a path');
                        return os.openFile(pathOf(args[0])) ? ok() : error('open: no file or available handler for ' + args[0]);
                    }
                    case 'nano': case 'vim': case 'code': {
                        if (args.length > 1) return error(command + ': expected one file');
                        const path = args[0] ? pathOf(args[0]) : null;
                        if (path && fs.get(path)?.type === 'folder') return error(command + ': is a directory');
                        if (path && !fs.exists(path) && !fs.write(path, '')) return error(command + ': cannot create file');
                        return launch('editor', path ? { path } : undefined);
                    }
                    case 'firefox': return launch('browser', args[0] ? { url: args[0] } : undefined);
                    case 'htop': case 'top': return launch('btop');
                    case 'sudo': {
                        if (!streaming) return error('sudo: interactive command cannot be piped or redirected');
                        if (!args.length) return error('usage: sudo command');
                        return interactive(state => {
                            prompt.textContent = '[sudo] password for lennox:';
                            input.type = 'password'; edit.classList.add('lx-term-password'); input.setAttribute('aria-label', 'Simulated sudo password');
                            state.submit = () => { print('sudo: password accepted by the Department of Absolutely No Root.\nYou already own this desktop. Try the command without sudo.', 'lx-term-muted'); state.finish(); };
                        });
                    }
                    case 'apt': case 'pacman': {
                        if (!streaming) return error(command + ': simulated installer cannot be piped or redirected');
                        const packages = args.filter(value => !value.startsWith('-') && value !== 'install');
                        if ((command === 'apt' && args[0] !== 'install') || (command === 'pacman' && !args.some(value => /^-[A-Za-z]*S/.test(value)) && args[0] !== 'install') || !packages.length) return error('usage: apt install package / pacman -S package');
                        print('Simulated package transaction: ' + packages.join(', ') + '\nNo network or system packages are changed.', 'lx-term-muted');
                        return interactive((state, schedule) => {
                            const progress = node('div', 'lx-term-line'); output.append(progress); let percent = 0;
                            const tick = () => {
                                percent += 10; progress.textContent = '[' + '#'.repeat(percent / 5) + ' '.repeat(20 - percent / 5) + '] ' + percent + '%'; scroll();
                                if (percent === 100) { print('Done. ' + packages.join(', ') + ' installed in your imagination.'); state.finish(); }
                                else schedule(tick, 100);
                            };
                            schedule(tick, 100);
                        });
                    }
                    case 'ping': {
                        if (!streaming) return error('ping: simulated replies cannot be piped or redirected');
                        const { operands, count, flags } = options(args, 'c', ['c']);
                        if (operands.length !== 1) return error('usage: ping [-c count] host');
                        const host = operands[0];
                        if (!/^[a-z\d][a-z\d.:-]*$/i.test(host) || host.length > 253) return error('ping: invalid hostname');
                        const limit = flags.has('c') ? count : Infinity;
                        if (!limit) return error('ping: count must be positive');
                        print('PING ' + host + ' (192.0.2.42): 56 data bytes [simulated; Ctrl+C stops]');
                        let sent = 0, total = 0; const started = Date.now();
                        return interactive((state, schedule) => {
                            const tick = () => {
                                const timing = 1 + Math.random() * 15; sent++; total += timing;
                                print('64 bytes from 192.0.2.42: icmp_seq=' + sent + ' ttl=64 time=' + timing.toFixed(2) + ' ms');
                                if (sent >= limit) state.finish(); else schedule(tick, 1000);
                            }; tick();
                        }, () => print('--- ' + host + ' ping statistics ---\n' + sent + ' packets transmitted, ' + sent + ' received, 0% packet loss, time ' + (Date.now() - started) + 'ms\nrtt avg = ' + (sent ? total / sent : 0).toFixed(2) + ' ms'));
                    }
                    case 'ssh': {
                        if (args.length !== 1 || !['proxmox', 'root@proxmox'].includes(args[0])) return error('ssh: available simulated host: proxmox');
                        remote = true; remoteCwd = '/root'; updatePrompt();
                        return ok('Connected to proxmox [simulated homelab session].\nDebian GNU/Linux · Proxmox VE 8 · no network connection\nTry: help, qm list, docker ps, uptime, hostname, pwd, exit\n');
                    }
                    case 'cowsay': {
                        const message = (args.join(' ') || stdin?.trim() || 'There is no cloud. Just someone else’s homelab.').slice(0, 80);
                        return ok(' ' + '_'.repeat(message.length + 2) + '\n< ' + message + ' >\n ' + '-'.repeat(message.length + 2) + '\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n');
                    }
                    case 'fortune': {
                        const sayings = ['There is no place like 127.0.0.1.', 'It worked on my machine. This is my machine.', 'Snapshots are cheaper than explanations.', 'A homelab is a heater with an IP address.', 'The best backup is the one you tested restoring.', 'Have you tried turning the container off and on again?'];
                        return ok(sayings[Math.floor(Math.random() * sayings.length)] + '\n');
                    }
                    case 'sl': case 'matrix': {
                        if (!streaming) return error(command + ': animation cannot be piped or redirected');
                        print(command + ' — any key stops', 'lx-term-muted');
                        return interactive((state, schedule) => {
                            state.key = () => state.finish();
                            const animation = node('pre', 'lx-term-animation'); animation.setAttribute('aria-hidden', 'true'); output.append(animation);
                            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                            let frame = 0;
                            const draw = () => {
                                frame++;
                                if (command === 'matrix') {
                                    const glyphs = '01LENNOXシステム';
                                    animation.textContent = Array.from({ length: 9 }, () => Array.from({ length: 62 }, () => Math.random() > .68 ? glyphs[Math.floor(Math.random() * glyphs.length)] : ' ').join('')).join('\n');
                                } else {
                                    const pad = ' '.repeat(Math.max(0, 30 - frame));
                                    animation.textContent = ['      (  ) ( )', '     _|__|__|___', ' ___|           |__', '|___  LENNOX    ___|====[___]', '   O==========O       O===O'].map(line => pad + line).join('\n');
                                }
                                scroll();
                                if (command === 'sl' && frame >= 38) state.finish();
                                else if (!reducedMotion) schedule(draw, command === 'matrix' ? 120 : 140);
                            };
                            draw();
                        });
                    }
                    case 'exit': ctx.close(); return ok();
                    default: return appIds.includes(command) ? launch(command, command === 'terminal' ? { cwd } : undefined) : { ...error(command + ': command not found. Try help.'), status: 127 };
                    }
                } catch (failure) { return error(failure instanceof Error ? failure.message : 'command failed'); }
            }
            function launch(id, args) { return os.openApp(id, args) ? ok() : error(id + ': application is not available'); }
            function remoteCommand(command, args) {
                switch (command) {
                case 'exit': case 'logout': remote = false; updatePrompt(); return ok('Connection to proxmox closed.\n');
                case 'help': return ok('Simulated proxmox: qm list · docker ps · ls · pwd · cd · whoami · hostname · uptime · uname -a · neofetch · clear · exit\n');
                case 'qm': return args[0] === 'list' ? ok(' VMID NAME                 STATUS     MEM(MB) BOOTDISK(GB) PID\n  100 docker-host          running       8192        64.00 1421\n  101 home-assistant       running       4096        32.00 1645\n  102 ai-lab               stopped      16384       128.00    0\n') : error('qm: try qm list');
                case 'docker': return args[0] === 'ps' ? ok('CONTAINER ID   IMAGE                    STATUS        NAMES\na17a01cafe42   portainer/portainer-ce   Up 12 days    portainer\nb33f01cafe42   nginx:alpine             Up 12 days    reverse-proxy\nc44d01cafe42   louislam/uptime-kuma      Up 12 days    uptime-kuma\n') : error('docker: try docker ps');
                case 'hostname': return ok('proxmox\n');
                case 'whoami': return ok('root\n');
                case 'pwd': return ok(remoteCwd + '\n');
                case 'cd': {
                    const next = resolvePath(args[0] || '/root', remoteCwd);
                    if (!['/', '/root', '/etc', '/var', '/var/lib', '/var/lib/vz'].includes(next)) return error('cd: directory unavailable in simulated node');
                    remoteCwd = next; updatePrompt(); return ok();
                }
                case 'ls': return ok(remoteCwd === '/' ? 'etc/  root/  var/\n' : remoteCwd === '/root' ? 'homelab.md  scripts/\n' : 'proxmox/  containers/\n');
                case 'uptime': return ok(' up 12 days, 4:20, 1 user, load average: 0.21, 0.18, 0.12 (simulated)\n');
                case 'uname': return ok('Linux proxmox 6.8.12-pve x86_64 GNU/Linux (simulated)\n');
                case 'neofetch': return ok('root@proxmox\nOS: Proxmox VE 8 (simulated)\nHost: Lennox homelab\nVMs: 3 · running: 2\nContainers: 3 running\nShell: lennox-sh remote demo\n');
                case 'clear': output.replaceChildren(); return ok();
                default: return { ...error(command + ': unavailable on this simulated node; try help or exit'), status: 127 };
                }
            }

            async function run(source, token) {
                const groups = parse(source); let status = 0;
                for (const group of groups) {
                    if (closed || token !== generation) return;
                    if (group.gate === '&&' && status !== 0) continue;
                    let stdin = null, result = ok();
                    for (let i = 0; i < group.pipeline.length; i++) {
                        if (closed || token !== generation) return;
                        const stage = group.pipeline[i], last = i === group.pipeline.length - 1;
                        let destination = null;
                        if (stage.redirect) {
                            destination = pathOf(stage.redirect.path);
                            if (fs.get(destination)?.type === 'folder' || fs.get(parent(destination))?.type !== 'folder') {
                                result = error('redirect: cannot write ' + stage.redirect.path);
                                print(result.error, 'lx-term-error'); break;
                            }
                        }
                        result = await execute(stage.argv, stdin, last && !stage.redirect);
                        if (closed || token !== generation) return;
                        if (result.error) print(result.error, 'lx-term-error');
                        if (result.status === 130) return;
                        if (stage.redirect && !result.error) {
                            const old = stage.redirect.append && fs.exists(destination) ? fs.read(destination) : '';
                            if (old === null || !fs.write(destination, old + result.text)) {
                                result = error('redirect: cannot write ' + stage.redirect.path);
                                print(result.error, 'lx-term-error');
                            } else result = { ...result, text: '', rich: null };
                        }
                        // Cap pipeline transport separately from scrollback rendering.
                        if (result.text.length > 1000000) throw new Error('pipeline exceeds 1,000,000 characters');
                        stdin = result.text;
                        if (last && !stage.redirect && result.text) {
                            if (result.rich) {
                                const line = node('div', 'lx-term-line');
                                let remaining = MAX_OUTPUT;
                                for (const part of result.rich) {
                                    if (remaining <= 0) break;
                                    line.append(node('span', part.className || '', part.text.slice(0, remaining)));
                                    remaining -= part.text.length;
                                }
                                output.append(line); scroll();
                            } else print(result.text, result.className);
                        }
                    }
                    status = result.status;
                }
            }
            function submit() {
                if (closed) return;
                if (active?.submit) { active.submit(input.value); input.value = ''; cursorPosition(); return; }
                if (busy) return;
                const source = input.value; input.value = ''; lastTab = ''; cursorPosition();
                echoCommand(source);
                if (!source.trim()) return;
                history.push(source); if (history.length > 500) history.shift(); historyIndex = history.length; draft = '';
                busy = true; input.setAttribute('aria-busy', 'true');
                const token = ++generation;
                run(source, token).catch(failure => {
                    if (!closed && token === generation) print('lennox-sh: ' + failure.message, 'lx-term-error');
                }).finally(() => {
                    if (!closed && token === generation) {
                        busy = false; input.value = ''; input.removeAttribute('aria-busy'); updatePrompt(); cursorPosition(); scroll();
                    }
                });
            }
            function complete() {
                const end = input.selectionStart ?? input.value.length;
                const before = input.value.slice(0, end);
                let tokens;
                try { tokens = tokenize(before); } catch (_) { return; }
                // Walk escaped spaces as part of a path instead of a new word.
                let start = 0;
                for (let i = 0; i < before.length; i++) {
                    if (before[i] === '\\') { i++; continue; }
                    if (/[\s;&|>]/.test(before[i])) start = i + 1;
                }
                const raw = before.slice(start);
                if (/["']/.test(raw)) return;
                const word = raw.replace(/\\(.)/g, '$1');
                const previousText = before.slice(0, start);
                const firstWord = !tokens.length || !previousText.trim() || /(?:&&|;|\|)\s*$/.test(previousText);
                let choices = [];
                if (firstWord && !word.includes('/')) choices = [...new Set(commands)].filter(value => value.startsWith(word));
                else {
                    const slash = word.lastIndexOf('/'), prefix = slash >= 0 ? word.slice(0, slash + 1) : '', partial = word.slice(slash + 1);
                    let directory;
                    try { directory = pathOf(prefix || '.'); } catch (_) { return; }
                    let entries = fs.list(directory) || [];
                    if (word === '~') choices = ['~/'];
                    else {
                        if (/^\s*cd\s/.test(previousText)) entries = entries.filter(entry => entry.type === 'folder');
                        choices = entries.filter(entry => entry.name.startsWith(partial) && (partial.startsWith('.') || !entry.name.startsWith('.'))).map(entry => prefix + entry.name + (entry.type === 'folder' ? '/' : ''));
                    }
                }
                if (!choices.length) return;
                choices.sort();
                let replacement = choices[0];
                for (const choice of choices.slice(1)) {
                    while (!choice.startsWith(replacement)) replacement = replacement.slice(0, -1);
                }
                const escapeWord = value => value.replace(/([\s\\"';&|>])/g, '\\$1');
                if (choices.length === 1) {
                    replacement = escapeWord(replacement) + (replacement.endsWith('/') ? '' : ' ');
                    input.setRangeText(replacement, start, end, 'end'); lastTab = '';
                } else {
                    if (lastTab === input.value) { print(choices.join('  '), 'lx-term-muted'); lastTab = ''; }
                    else {
                        if (replacement.length > word.length) input.setRangeText(escapeWord(replacement), start, end, 'end');
                        lastTab = input.value;
                    }
                }
                cursorPosition(); scroll();
            }
            input.addEventListener('keydown', event => {
                if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === 'c') {
                    if (window.getSelection()?.toString()) return;
                    event.preventDefault();
                    if (active) { print('^C', 'lx-term-muted'); active.cancel(); }
                    else { ++generation; busy = false; input.removeAttribute('aria-busy'); echoCommand(input.value, '^C'); input.value = ''; updatePrompt(); }
                    cursorPosition(); return;
                }
                if (event.ctrlKey && event.key.toLowerCase() === 'l') {
                    event.preventDefault(); output.replaceChildren(); scroll(); return;
                }
                if (event.altKey || event.metaKey || event.isComposing || event.key === 'Escape') return;
                if (active?.key && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                    event.preventDefault(); active.key(); return;
                }
                if (event.key === 'Enter') { event.preventDefault(); submit(); return; }
                if (busy) {
                    if (!active?.submit && !event.ctrlKey) event.preventDefault();
                    return;
                }
                if (event.key !== 'Tab') lastTab = '';
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    if (historyIndex === history.length) draft = input.value;
                    historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
                    input.value = historyIndex === history.length ? draft : history[historyIndex];
                    input.setSelectionRange(input.value.length, input.value.length); cursorPosition();
                } else if (event.key === 'Tab') { event.preventDefault(); complete(); }
            });
            input.addEventListener('input', () => { lastTab = ''; cursorPosition(); });
            input.addEventListener('keyup', cursorPosition);
            input.addEventListener('click', cursorPosition);
            input.addEventListener('scroll', cursorPosition);
            root.addEventListener('click', () => { if (!window.getSelection()?.toString()) focus(); });
            ctx.onFocus(focus);
            ctx.onResize(cursorPosition);
            ctx.onClose(() => {
                closed = true; ++generation; active?.cancel(); clearTimers();
            });
            updatePrompt();
            print('Lennox_OS · lennox-sh', 'lx-term-accent');
            print('Local files. Real curiosity. Type help or neofetch.\nNetwork / SSH / package commands are playful simulations.', 'lx-term-muted');
            focus();
        }
    });
})();
