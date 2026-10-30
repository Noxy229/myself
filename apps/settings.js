(() => {
    'use strict';
    const os = window.LennoxOS;
    const el = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    };
    const button = (text, action) => {
        const node = el('button', text); node.type = 'button';
        node.addEventListener('click', action); return node;
    };
    if (!document.getElementById('app-settings-style')) {
        const style = el('style'); style.id = 'app-settings-style';
        style.textContent = `
.lx-settings{display:flex;height:100%;min-height:0;background:var(--window-bg);color:var(--text-bright);font:14px/1.5 system-ui,sans-serif}
.lx-settings *{box-sizing:border-box}.lx-settings nav{width:175px;flex-shrink:0;padding:20px 12px;border-right:1px solid var(--window-border);background:var(--desktop-bg);overflow:auto}
.lx-settings nav strong{display:block;padding:0 10px 18px;font-size:18px}.lx-settings button,.lx-settings input{font:inherit;color:inherit}
.lx-settings button{cursor:pointer;border:1px solid var(--window-border);background:var(--desktop-bg);border-radius:7px;padding:9px 12px}
.lx-settings button:hover,.lx-settings button:focus-visible{border-color:var(--accent)}.lx-settings nav button{width:100%;text-align:left;margin-bottom:6px}
.lx-settings button[aria-current=true],.lx-settings button[aria-pressed=true]{border-color:var(--accent);box-shadow:inset 3px 0 var(--accent)}
.lx-settings main{flex:1;min-width:0;overflow:auto;padding:26px}.lx-settings h1{font-size:25px;margin:0 0 4px}.lx-settings h2{font-size:16px;margin:22px 0 12px}
.lx-settings p{color:var(--text-dim);margin:8px 0 18px}.lx-settings .lx-setting-card{padding:16px;border:1px solid var(--window-border);border-radius:10px;margin:12px 0}
.lx-settings .lx-wallpapers{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px}.lx-settings .lx-wallpaper{padding:7px;text-align:left}
.lx-settings .lx-wallpaper span{display:block;height:70px;border-radius:4px;margin-bottom:7px}.lx-settings .lx-swatches{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
.lx-settings .lx-swatches button{width:34px;height:34px;padding:0;border-radius:50%;background:var(--swatch)}.lx-settings label{display:block;margin:12px 0}
.lx-settings input[type=range]{width:100%;accent-color:var(--accent)}.lx-settings input[type=checkbox]{accent-color:var(--accent);margin-right:8px}
.lx-settings input[type=color]{width:46px;height:34px;padding:2px;background:var(--desktop-bg);border:1px solid var(--window-border)}
.lx-settings dl{display:grid;grid-template-columns:100px 1fr;gap:12px}.lx-settings dt{color:var(--text-dim)}.lx-settings dd{margin:0;overflow-wrap:anywhere}
.lx-settings ul{padding-left:20px}.lx-settings .lx-danger{margin-top:15px;color:var(--accent)}
@media(max-width:520px){.lx-settings nav{width:125px;padding:12px 6px}.lx-settings nav button{font-size:12px;padding:8px}.lx-settings main{padding:16px}.lx-settings dl{grid-template-columns:1fr;gap:4px}}`;
        document.head.append(style);
    }
    os.registerApp({
        id: 'settings', title: 'Settings', desktop: true, startMenu: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10 2-1 3-3-1-2 3 2 3-2 2 2 4 3-1 1 3h4l1-3 3 1 2-4-2-2 2-3-2-3-3 1-1-3zm2 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8"/></svg>',
        defaultSize: { w: 760, h: 570 }, minSize: { w: 340, h: 300 },
        onOpen(ctx) {
            ctx.body.style.padding = '0'; ctx.body.style.overflow = 'hidden';
            const root = el('div', undefined, 'lx-settings');
            const nav = el('nav'); nav.setAttribute('aria-label', 'Settings sections');
            nav.append(el('strong', 'Settings'));
            const main = el('main'); root.append(nav, main); ctx.body.append(root);
            const sections = ['Personalization', 'Sound', 'Notifications', 'Apps', 'Storage', 'About'];
            const navigation = new Map(); let current = 'personalization'; let sync = () => {}; let closed = false;
            const audio = document.createElement('audio'); audio.src = 'audio/intro.ogg'; audio.preload = 'none'; root.append(audio);
            function show(section) {
                section = typeof section === 'string' ? section.toLowerCase() : 'personalization';
                if (section === 'wallpaper') section = 'personalization';
                if (!navigation.has(section)) section = 'personalization';
                current = section; main.replaceChildren(); sync = () => {};
                navigation.forEach((node, key) => node.setAttribute('aria-current', String(key === section)));
                ctx.setTitle('Settings — ' + sections.find(name => name.toLowerCase() === section));
                main.append(el('h1', sections.find(name => name.toLowerCase() === section)));
                if (section === 'personalization') {
                    main.append(el('p', 'Make this workspace yours.'), el('h2', 'Wallpaper'));
                    const wallpapers = el('div', undefined, 'lx-wallpapers'); const choices = [];
                    for (const wallpaper of os.wallpapers) {
                        const choice = button('', () => os.setWallpaper(wallpaper.id)); choice.className = 'lx-wallpaper';
                        const preview = el('span'); preview.style.backgroundImage = wallpaper.image; preview.style.backgroundSize = wallpaper.size; preview.style.backgroundColor = wallpaper.color;
                        choice.append(preview, document.createTextNode(wallpaper.title)); wallpapers.append(choice); choices.push([choice, wallpaper.id]);
                    }
                    main.append(wallpapers, el('h2', 'Accent color'));
                    const swatches = el('div', undefined, 'lx-swatches'); const colors = [];
                    for (const color of ['#ff2a2a', '#ff9f43', '#feca57', '#10ac84', '#2e86de', '#a55eea', '#ee5a9d']) {
                        const choice = button('', () => os.settings.set('accent', color)); choice.style.setProperty('--swatch', color); choice.setAttribute('aria-label', 'Accent ' + color); swatches.append(choice); colors.push([choice, color]);
                    }
                    const custom = el('input'); custom.type = 'color'; custom.setAttribute('aria-label', 'Custom accent color'); custom.addEventListener('input', () => os.settings.set('accent', custom.value));
                    swatches.append(el('span', 'Custom'), custom); main.append(swatches);
                    sync = () => {
                        choices.forEach(([node, id]) => node.setAttribute('aria-pressed', String(os.settings.get('wallpaper', 'grid') === id)));
                        const accent = os.settings.get('accent', '#ff2a2a'); custom.value = accent;
                        colors.forEach(([node, color]) => node.setAttribute('aria-pressed', String(accent.toLowerCase() === color)));
                    };
                } else if (section === 'sound') {
                    main.append(el('p', 'Output volume for Lennox_OS and its apps.'));
                    const card = el('div', undefined, 'lx-setting-card'); const label = el('label', 'Volume'); const output = el('output');
                    const volume = el('input'); volume.type = 'range'; volume.min = '0'; volume.max = '100'; volume.setAttribute('aria-label', 'Volume'); volume.addEventListener('input', () => os.settings.set('volume', Number(volume.value) / 100));
                    const muteLabel = el('label'); const mute = el('input'); mute.type = 'checkbox'; mute.addEventListener('change', () => os.settings.set('muted', mute.checked)); muteLabel.append(mute, document.createTextNode('Mute all audio'));
                    card.append(label, output, volume, muteLabel, button('Test sound', () => {
                        audio.currentTime = 0;
                        audio.play().catch(() => { if (!closed) os.notify({ title: 'Sound unavailable', body: 'The local test audio could not be played.' }); });
                    })); main.append(card);
                    sync = () => { volume.value = String(Math.round(os.settings.get('volume', 1) * 100)); output.value = volume.value + '%'; mute.checked = os.settings.get('muted', false); audio.volume = os.settings.get('volume', 1); audio.muted = mute.checked; };
                } else if (section === 'notifications') {
                    main.append(el('p', 'Notifications appear above the taskbar and stay in the notification center.'), button('Send test notification', () => os.notify({ title: 'Hello from Lennox_OS', body: 'Your workspace notifications are working.' })));
                } else if (section === 'apps') {
                    main.append(el('p', 'Applications available from the desktop and Start.'));
                    const list = el('ul'); main.append(list);
                    sync = () => {
                        const names = new Map();
                        document.querySelectorAll('#desktop-icons [data-app], #start-menu [data-app]').forEach(node => names.set(node.dataset.app, node.textContent.trim() || node.dataset.app));
                        list.replaceChildren(...Array.from(names.values()).sort().map(name => el('li', name)));
                        if (!names.size) list.append(el('li', 'Open Start to see available applications.'));
                    };
                } else if (section === 'storage') {
                    main.append(el('p', 'Virtual files stored in this browser. This does not measure your physical disk.'));
                    const usage = el('div', undefined, 'lx-setting-card'); usage.setAttribute('aria-live', 'polite'); main.append(usage);
                    sync = () => {
                        let files = 0; let folders = 0; let bytes = 0;
                        const queue = ['/']; const seen = new Set();
                        while (queue.length) {
                            const path = queue.pop(); if (seen.has(path)) continue; seen.add(path);
                            for (const node of os.fs.list(path) || []) {
                                if (node.type === 'folder') { folders++; queue.push(node.path); }
                                else { files++; bytes += new TextEncoder().encode(node.content).byteLength; }
                            }
                        }
                        usage.textContent = files + ' files · ' + folders + ' folders · ' + bytes.toLocaleString() + ' bytes of UTF-8 text';
                    };
                    const reset = button('Reset filesystem', () => {
                        if (!window.confirm('Permanently delete every virtual file and folder? This cannot be undone. Settings are kept.')) return;
                        const children = os.fs.list('/') || [];
                        const removed = children.every(node => os.fs.remove(node.path));
                        if (removed) window.location.reload();
                        else os.notify({ title: 'Reset incomplete', body: 'Some virtual files could not be removed.' });
                    }); reset.className = 'lx-danger'; main.append(reset, el('p', 'Reset empties the virtual filesystem. Default files are not restored on reload.'));
                } else {
                    main.append(el('p', 'Lennox_OS · desktop portfolio · v1'));
                    const specs = el('dl');
                    for (const [key, value] of [['Owner', 'Lennox'], ['Role', 'Fachinformatiker Systemintegration apprentice'], ['Location', 'Niedersachsen'], ['CPU', 'Intel i5-13600KF'], ['GPU', 'AMD Radeon RX 9070 XT'], ['Case', 'Hyte Y60'], ['Displays', '3× LG displays']]) specs.append(el('dt', key), el('dd', value));
                    main.append(specs, button('Open Nexus in Browser', () => os.openApp('browser', { url: 'nexus' })));
                }
                sync(); main.scrollTop = 0;
            }
            for (const title of sections) { const key = title.toLowerCase(); const node = button(title, () => show(key)); navigation.set(key, node); nav.append(node); }
            const onSettings = () => { audio.volume = os.settings.get('volume', 1); audio.muted = os.settings.get('muted', false); sync(); };
            const onFS = () => { if (current === 'storage') sync(); };
            const onApp = () => { if (current === 'apps') sync(); };
            os.settings.addEventListener('change', onSettings); os.fs.addEventListener('change', onFS); os.addEventListener('appregistered', onApp);
            ctx.onArgs(args => show(args?.section));
            ctx.onClose(() => { closed = true; audio.pause(); audio.removeAttribute('src'); audio.load(); os.settings.removeEventListener('change', onSettings); os.fs.removeEventListener('change', onFS); os.removeEventListener('appregistered', onApp); });
            show(ctx.args?.section);
        }
    });
})();
