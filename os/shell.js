/* Lennox_OS shell. Classic script; no network or module loader required. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const desktop = $('desktop');
    const icons = $('desktop-icons');
    const windowLayer = $('windows');
    const taskButtons = $('task-buttons');
    const startMenu = $('start-menu');
    const search = $('start-search');
    const menu = $('context-menu');
    const center = $('notification-center');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 768px)');
    const events = new EventTarget();
    const apps = new Map();
    const records = new Map();
    const stack = [];
    const handlers = new Map();
    const notices = [];
    const storagePrefix = 'lennox-os.v1.';
    const fileIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h9l5 5v15H5V2zm9 2v5h5M8 13h8v1H8zm0 4h8v1H8z"/></svg>';
    let sequence = 0;
    let bootState = 'idle';
    let bootGeneration = 0;
    let lastFocused = null;
    let menuOpener = null;
    let desktopGesture = null;
    let activeGesture = null;
    let iconClickSuppressed = false;
    let desktopRefreshPending = false;
    let currentAudio = null;

    // Storage failure (including file:// restrictions) leaves a usable in-memory session.
    function load(key, fallback) {
        try { const value = localStorage.getItem(storagePrefix + key); return value === null ? fallback : JSON.parse(value); }
        catch (_) { return fallback; }
    }
    function store(key, value) {
        try { localStorage.setItem(storagePrefix + key, JSON.stringify(value)); return true; }
        catch (_) { return false; }
    }
    const objectOrEmpty = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const settingsData = Object.assign(Object.create(null), { accent: '#ff2a2a', volume: 1, muted: false, wallpaper: 'grid' }, objectOrEmpty(load('settings', {})));
    const geometry = Object.assign(Object.create(null), objectOrEmpty(load('geometry', {})));
    const iconPositions = Object.assign(Object.create(null), objectOrEmpty(load('icons', {})));
    const clamp = (n, low, high) => Math.min(Math.max(n, low), Math.max(low, high));
    const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
    function emit(target, type, detail) { target.dispatchEvent(new CustomEvent(type, { detail })); }
    function hook(record, name, ...args) {
        for (const callback of record.hooks[name]) {
            try { callback(...args); } catch (error) { console.error('Lennox_OS app hook:', error); }
        }
    }
    function button(label, className, action) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = className || '';
        element.textContent = label;
        if (action) element.addEventListener('click', action);
        return element;
    }
    function svgSlot(svg, className) {
        const span = document.createElement('span');
        span.className = className || '';
        // Icons are trusted application code, never filesystem/user text.
        span.innerHTML = svg || fileIcon;
        span.setAttribute('aria-hidden', 'true');
        span.querySelectorAll('svg').forEach(node => node.setAttribute('focusable', 'false'));
        return span;
    }
    const wallpapers = Object.freeze([
        Object.freeze({ id: 'grid', title: 'Red Grid', image: 'radial-gradient(circle at 50% 50%, #ff2a2a0d, transparent 60%), linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)', size: '100% 100%, 30px 30px, 30px 30px', color: '#11141c' }),
        Object.freeze({ id: 'ember', title: 'Ember', image: 'radial-gradient(ellipse at 80% 100%, #a6192966, transparent 65%), linear-gradient(135deg, #05070d, #15101c)', size: 'cover', color: '#08090f' }),
        Object.freeze({ id: 'circuit', title: 'Circuit', image: 'repeating-linear-gradient(45deg, transparent 0 38px, #ff2a2a12 38px 40px), repeating-linear-gradient(-45deg, transparent 0 78px, #ffffff06 78px 80px)', size: 'auto', color: '#080e14' }),
        Object.freeze({ id: 'void', title: 'Void', image: 'radial-gradient(ellipse at 50% 0%, #292f44, #06080d 70%)', size: 'cover', color: '#06080d' })
    ]);
    function applyWallpaper(id) {
        const wallpaper = wallpapers.find(item => item.id === id);
        if (!wallpaper) return false;
        const style = document.documentElement.style;
        style.setProperty('--wallpaper-image', wallpaper.image);
        style.setProperty('--wallpaper-size', wallpaper.size);
        style.setProperty('--desktop-bg', wallpaper.color);
        return true;
    }
    function applyAudio(element) {
        if (!(element instanceof HTMLMediaElement)) return;
        element.muted = Boolean(settingsData.muted);
        element.volume = clamp(finite(settingsData.volume, 1), 0, 1);
    }
    function syncSettings() {
        const accent = /^#[\da-f]{6}$/i.test(settingsData.accent) ? settingsData.accent : '#ff2a2a';
        document.documentElement.style.setProperty('--accent', accent);
        applyWallpaper(settingsData.wallpaper) || applyWallpaper('grid');
        document.querySelectorAll('audio,video').forEach(applyAudio);
        if (currentAudio) applyAudio(currentAudio);
        const muted = Boolean(settingsData.muted) || settingsData.volume === 0;
        $('volume-button').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/>' + (muted ? '<path d="m16 8 5 8m0-8-5 8" fill="none" stroke="currentColor" stroke-width="2"/>' : '<path d="M15 8q6 4 0 8m3-11q9 7 0 14" fill="none" stroke="currentColor" stroke-width="1.5"/>') + '</svg>';
        $('volume-button').setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
        $('volume-button').setAttribute('aria-pressed', String(Boolean(settingsData.muted)));
    }
    const settings = {
        get(key, fallback) { return Object.hasOwn(settingsData, key) ? structuredCopy(settingsData[key]) : fallback; },
        set(key, value) {
            if (typeof key !== 'string' || !key || ['__proto__', 'constructor', 'prototype'].includes(key)) return false;
            if (key === 'accent' && (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))) return false;
            if (key === 'volume' && (!Number.isFinite(value) || value < 0 || value > 1)) return false;
            if (key === 'muted' && typeof value !== 'boolean') return false;
            if (key === 'wallpaper' && !wallpapers.some(item => item.id === value)) return false;
            let copy;
            try { copy = JSON.parse(JSON.stringify(value)); } catch (_) { return false; }
            settingsData[key] = copy;
            store('settings', settingsData);
            syncSettings();
            const detail = { key, value: structuredCopy(copy) };
            emit(events, 'settingschange', detail);
            emit(settingsEvents, 'change', detail);
            return true;
        },
        addEventListener(...args) { settingsEvents.addEventListener(...args); },
        removeEventListener(...args) { settingsEvents.removeEventListener(...args); }
    };
    function structuredCopy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
    const settingsEvents = new EventTarget();
    $('volume-button').addEventListener('click', () => settings.set('muted', !settings.get('muted')));
    document.addEventListener('play', event => applyAudio(event.target), true);
    new MutationObserver(changes => {
        for (const change of changes) for (const node of change.addedNodes) {
            if (!(node instanceof Element)) continue;
            applyAudio(node);
            node.querySelectorAll('audio,video').forEach(applyAudio);
        }
    }).observe(document.body, { childList: true, subtree: true });
    syncSettings();

    // Virtual filesystem. Flat absolute paths keep moves and directory traversal bounded.
    const fsEvents = new EventTarget();
    const profileText = 'LENNOX NORDMANN\nSYSTEMS ARCHITECT // AI_INFRASTRUCTURE\n\nRole: Fachinformatiker (Systemintegration)\nStack: Proxmox, Docker, Linux, AI Agents.\n\nI build high-end infrastructure, homelabs, and intelligent systems. Bridging the gap between raw compute power and architectural design.';
    const projectsText = '# DECRYPTED ARCHIVES\n\n## ASTRA\nSelf-hosted AI chat client featuring a Gemini-style UI. Next.js 15, Tailwind, SQLite, Multi-Provider.\n\n## BERICHTSHEFT\nIHK-compliant automated logging for apprentices in Niedersachsen.\n\n## SCROLLCRAFT\nClaude Code skill for premium scroll-driven websites on a real design floor.\n';
    function normalize(path) {
        if (typeof path !== 'string' || !path.startsWith('/') || path.includes('\0') || path.length > 2048) return null;
        const parts = [];
        for (const part of path.split('/')) {
            if (!part || part === '.') continue;
            if (part === '..') parts.pop(); else parts.push(part);
        }
        return '/' + parts.join('/');
    }
    const parentPath = path => path.slice(0, path.lastIndexOf('/')) || '/';
    const nameOf = path => path.split('/').pop() || '/';
    let nodes = Object.create(null);
    const savedFS = objectOrEmpty(load('fs', {}));
    for (const [path, node] of Object.entries(savedFS)) {
        if (normalize(path) === path && node && (node.type === 'folder' || (node.type === 'file' && typeof node.content === 'string'))) {
            nodes[path] = { type: node.type, ...(node.type === 'file' ? { content: node.content } : {}), modified: finite(node.modified, Date.now()) };
        }
    }
    // Drop malformed orphans rather than exposing a partial tree from damaged storage.
    for (const path of Object.keys(nodes).sort((a, b) => a.length - b.length)) {
        if (path !== '/' && nodes[parentPath(path)]?.type !== 'folder') delete nodes[path];
    }
    if (nodes['/']?.type !== 'folder') nodes = Object.create(null);
    if (!nodes['/']) {
        for (const path of ['/', '/home', '/home/lennox', '/home/lennox/Desktop', '/home/lennox/Documents', '/home/lennox/Pictures', '/system']) nodes[path] = { type: 'folder', modified: Date.now() };
        nodes['/home/lennox/Documents/about.txt'] = { type: 'file', content: profileText, modified: Date.now() };
        nodes['/home/lennox/Documents/projects.md'] = { type: 'file', content: projectsText, modified: Date.now() };
        nodes['/system/readme.txt'] = { type: 'file', content: 'Welcome to Lennox_OS.\nFiles and settings are stored in this browser.\nDouble-click applications to open them; use Start to search.\nAlt+W closes a window, Alt+M minimizes, Escape dismisses menus first.\n', modified: Date.now() };
        store('fs', nodes);
    }
    function fileInfo(path) {
        const node = nodes[path];
        return node ? { path, name: nameOf(path), ...node } : null;
    }
    function fsChange(operation, path, extra = {}) {
        store('fs', nodes);
        const detail = { operation, path, ...extra };
        emit(fsEvents, 'change', detail);
        emit(events, 'fschange', detail);
        renderDesktop();
    }
    const fs = {
        get(path) { path = normalize(path); return path ? fileInfo(path) : null; },
        exists(path) { path = normalize(path); return Boolean(path && nodes[path]); },
        list(path) {
            path = normalize(path);
            if (!path || nodes[path]?.type !== 'folder') return null;
            return Object.keys(nodes).filter(item => item !== path && parentPath(item) === path).map(fileInfo).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
        },
        read(path) { path = normalize(path); return path && nodes[path]?.type === 'file' ? nodes[path].content : null; },
        write(path, text) {
            path = normalize(path);
            if (!path || path === '/' || typeof text !== 'string' || text.length > 1_000_000 || nodes[path]?.type === 'folder' || nodes[parentPath(path)]?.type !== 'folder') return false;
            nodes[path] = { type: 'file', content: text, modified: Date.now() };
            fsChange('write', path);
            return true;
        },
        mkdir(path) {
            path = normalize(path);
            if (!path || nodes[path] || nodes[parentPath(path)]?.type !== 'folder') return false;
            nodes[path] = { type: 'folder', modified: Date.now() };
            fsChange('mkdir', path);
            return true;
        },
        remove(path) {
            path = normalize(path);
            if (!path || path === '/' || !nodes[path]) return false;
            for (const item of Object.keys(nodes)) if (item === path || item.startsWith(path + '/')) delete nodes[item];
            fsChange('remove', path);
            return true;
        },
        rename(from, to) {
            from = normalize(from); to = normalize(to);
            if (!from || !to || from === '/' || to === '/' || !nodes[from] || nodes[to] || to.startsWith(from + '/') || nodes[parentPath(to)]?.type !== 'folder') return false;
            const moves = Object.keys(nodes).filter(item => item === from || item.startsWith(from + '/')).map(item => [item, to + item.slice(from.length)]);
            for (const [oldPath, newPath] of moves) { nodes[newPath] = nodes[oldPath]; delete nodes[oldPath]; }
            fsChange('rename', to, { from });
            return true;
        },
        addEventListener(...args) { fsEvents.addEventListener(...args); },
        removeEventListener(...args) { fsEvents.removeEventListener(...args); }
    };

    function viewport() { return { w: desktop.clientWidth, h: Math.max(1, desktop.clientHeight - $('taskbar').offsetHeight) }; }
    function rectOf(win) { return { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight }; }
    function bounds(rect, app) {
        const { w, h } = viewport();
        const width = clamp(finite(rect.w, 500), Math.min(app.minSize.w, w), w);
        const height = clamp(finite(rect.h, 350), Math.min(app.minSize.h, h), h);
        return { x: clamp(finite(rect.x, 80), 0, w - width), y: clamp(finite(rect.y, 50), 0, h - height), w: width, h: height };
    }
    function paintRect(record, rect) {
        Object.assign(record.win.style, { left: Math.round(rect.x) + 'px', top: Math.round(rect.y) + 'px', width: Math.round(rect.w) + 'px', height: Math.round(rect.h) + 'px' });
    }
    function modeRect(mode) {
        const { w, h } = viewport();
        if (mode === 'left') return { x: 0, y: 0, w: Math.floor(w / 2), h };
        if (mode === 'right') return { x: Math.floor(w / 2), y: 0, w: w - Math.floor(w / 2), h };
        return { x: 0, y: 0, w, h };
    }
    function layout(record) {
        const maximized = narrow.matches || record.mode === 'maximized';
        record.win.classList.toggle('is-maximized', maximized);
        record.win.dataset.state = narrow.matches ? 'maximized' : record.mode;
        record.maxButton.setAttribute('aria-label', maximized ? 'Restore window' : 'Maximize window');
        record.maxButton.textContent = maximized ? '❐' : '□';
        paintRect(record, narrow.matches || record.mode !== 'normal' ? modeRect(narrow.matches ? 'maximized' : record.mode) : bounds(record.normal, record.app));
    }
    function saveRect(record) {
        if (narrow.matches || record.mode !== 'normal') return;
        record.normal = rectOf(record.win);
        geometry[record.app.id] = { ...record.normal };
        store('geometry', geometry);
    }
    function topRecord() { return stack.findLast(record => !record.minimized) || null; }
    function restack() {
        const top = topRecord();
        stack.forEach((record, index) => {
            record.win.style.zIndex = String(20 + index);
            record.win.classList.toggle('is-focused', record === top);
            record.task.classList.toggle('is-active', record === top);
            record.task.classList.toggle('is-minimized', record.minimized);
            record.task.setAttribute('aria-pressed', String(record === top));
        });
        if (top !== lastFocused) {
            lastFocused = top;
            if (top) hook(top, 'focus');
        }
    }
    function focus(record, moveFocus = true) {
        if (!record || !records.has(record.win)) return;
        record.minimized = false;
        record.win.hidden = false;
        record.win.inert = false;
        cancelAnimation(record);
        const index = stack.indexOf(record);
        if (index >= 0) stack.splice(index, 1);
        stack.push(record);
        restack();
        if (moveFocus && !record.win.contains(document.activeElement)) record.body.focus({ preventScroll: true });
    }
    function focusNext(fallback) {
        const next = topRecord();
        if (next) focus(next);
        else (fallback?.isConnected && !fallback.closest('.window') ? fallback : $('start-button')).focus({ preventScroll: true });
    }
    function cancelAnimation(record) {
        if (record.animation) { record.animation.cancel(); record.animation = null; }
    }
    function animate(record, frames, done) {
        cancelAnimation(record);
        if (reduced.matches || !record.win.animate) { if (done) done(); return; }
        const animation = record.win.animate(frames, { duration: 170, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
        record.animation = animation;
        animation.onfinish = () => {
            if (record.animation !== animation) return;
            record.animation = null;
            animation.cancel();
            if (done) done();
        };
    }
    function minimize(record) {
        if (!record || record.minimized || !records.has(record.win)) return;
        finishWindowGesture(record);
        record.minimized = true;
        record.win.inert = true;
        const rect = record.win.getBoundingClientRect();
        const target = record.task.getBoundingClientRect();
        animate(record, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${target.x - rect.x + target.width / 2 - rect.width / 2}px,${target.y + target.height / 2 - rect.y - rect.height / 2}px) scale(.08)`, opacity: 0 }], () => { if (record.minimized) record.win.hidden = true; });
        restack();
        focusNext(record.task);
    }
    function maximize(record) {
        if (narrow.matches) return;
        finishWindowGesture(record);
        if (record.mode === 'normal') saveRect(record);
        record.mode = record.mode === 'maximized' ? 'normal' : 'maximized';
        layout(record);
        focus(record);
    }
    function closeWindow(win) {
        const record = records.get(win);
        if (!record) return false;
        finishWindowGesture(record);
        saveRect(record);
        records.delete(win);
        stack.splice(stack.indexOf(record), 1);
        record.abort.abort();
        record.observer.disconnect();
        record.task.remove();
        record.win.inert = true;
        record.win.classList.add('is-closing');
        hook(record, 'close');
        restack();
        if (record.win.contains(document.activeElement) || lastFocused === null || document.activeElement === document.body) focusNext(record.opener);
        animate(record, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], () => win.remove());
        return true;
    }
    function addHook(record, type, callback) {
        if (typeof callback !== 'function') throw new TypeError('Hook must be a function');
        record.hooks[type].add(callback);
        return () => record.hooks[type].delete(callback);
    }
    function openApp(id, args) {
        const app = apps.get(id);
        if (!app) return null;
        hideMenus();
        if (!app.multiInstance) {
            const existing = stack.find(record => record.app.id === id);
            if (existing) {
                existing.ctx.args = args;
                hook(existing, 'args', args);
                focus(existing);
                return existing.win;
            }
        }
        const win = document.createElement('section');
        win.className = 'window';
        win.id = `window-${++sequence}`;
        win.dataset.app = id;
        win.setAttribute('role', 'dialog');
        const titleId = win.id + '-title';
        win.setAttribute('aria-labelledby', titleId);
        const bar = document.createElement('div');
        bar.className = 'title-bar';
        bar.append(svgSlot(app.icon, 'window-icon'));
        const title = document.createElement('span');
        title.id = titleId;
        title.className = 'window-title';
        title.textContent = app.title;
        bar.append(title);
        const controls = document.createElement('div');
        controls.className = 'window-controls';
        const minButton = button('−', 'minimize-btn', () => minimize(record));
        minButton.setAttribute('aria-label', 'Minimize window');
        const maxButton = button('□', 'maximize-btn', () => maximize(record));
        const closeButton = button('×', 'close-btn', () => closeWindow(win));
        closeButton.setAttribute('aria-label', 'Close window');
        controls.append(minButton, maxButton, closeButton);
        bar.append(controls);
        const body = document.createElement('div');
        body.className = 'window-content';
        body.tabIndex = 0;
        win.append(bar, body);
        const task = button('', 'task-button');
        task.append(svgSlot(app.icon));
        const taskTitle = document.createElement('span');
        taskTitle.textContent = app.title;
        task.append(taskTitle);
        task.setAttribute('aria-controls', win.id);
        task.title = app.title;
        taskButtons.append(task);
        windowLayer.append(win);
        const saved = objectOrEmpty(geometry[id]);
        const offset = (stack.length % 8) * 28;
        const duplicate = stack.some(item => item.app.id === id);
        const normal = bounds({ x: finite(saved.x, 130) + (duplicate || !Object.keys(saved).length ? offset : 0), y: finite(saved.y, 45) + (duplicate || !Object.keys(saved).length ? offset : 0), w: finite(saved.w, app.defaultSize.w), h: finite(saved.h, app.defaultSize.h) }, app);
        const record = { app, win, body, bar, maxButton, task, normal, mode: 'normal', minimized: false, animation: null, opener: document.activeElement, abort: new AbortController(), hooks: { close: new Set(), focus: new Set(), resize: new Set(), args: new Set() }, ctx: null, observer: null };
        const ctx = {
            win, body, args,
            setTitle(value) { title.textContent = String(value); taskTitle.textContent = String(value); task.title = String(value); },
            close() { return closeWindow(win); },
            onClose(callback) { return addHook(record, 'close', callback); },
            onFocus(callback) { return addHook(record, 'focus', callback); },
            onResize(callback) { return addHook(record, 'resize', callback); },
            onArgs(callback) { return addHook(record, 'args', callback); }
        };
        record.ctx = ctx;
        records.set(win, record);
        stack.push(record);
        layout(record);
        const options = { signal: record.abort.signal };
        task.addEventListener('click', () => record === topRecord() && !record.minimized ? minimize(record) : focus(record), options);
        win.addEventListener('pointerdown', () => focus(record, false), options);
        win.addEventListener('focusin', () => focus(record, false), options);
        bar.addEventListener('dblclick', event => { if (!event.target.closest('button')) maximize(record); }, options);
        bar.addEventListener('pointerdown', event => beginWindowGesture(event, record, null), options);
        for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle resize-' + edge;
            handle.setAttribute('aria-hidden', 'true');
            handle.addEventListener('pointerdown', event => beginWindowGesture(event, record, edge), options);
            win.append(handle);
        }
        record.observer = new ResizeObserver(() => { if (records.has(win) && !record.minimized) hook(record, 'resize', { width: body.clientWidth, height: body.clientHeight }); });
        record.observer.observe(body);
        try { app.onOpen(ctx); }
        catch (error) { console.error('Lennox_OS app open:', error); closeWindow(win); notify({ title: 'Application error', body: app.title + ' could not open.' }); return null; }
        if (!records.has(win)) return null;
        focus(record);
        animate(record, [{ opacity: 0, transform: 'translateY(12px) scale(.96)' }, { opacity: 1, transform: 'none' }]);
        return win;
    }
    function registerApp(spec) {
        if (!spec || typeof spec.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(spec.id) || typeof spec.title !== 'string' || typeof spec.onOpen !== 'function') throw new TypeError('Invalid app registration');
        if (apps.has(spec.id)) throw new Error('App already registered: ' + spec.id);
        const size = (value, defaults) => ({ w: Math.max(100, finite(value?.w, defaults.w)), h: Math.max(80, finite(value?.h, defaults.h)) });
        const app = Object.freeze({ id: spec.id, title: spec.title, icon: typeof spec.icon === 'string' ? spec.icon : fileIcon, desktop: spec.desktop === true, startMenu: spec.startMenu !== false, multiInstance: spec.multiInstance === true, defaultSize: size(spec.defaultSize, { w: 500, h: 350 }), minSize: size(spec.minSize, { w: 260, h: 180 }), onOpen: spec.onOpen });
        apps.set(app.id, app);
        renderDesktop();
        renderStart();
        emit(events, 'appregistered', { id: app.id });
        return app;
    }

    // One capture owner for every window gesture; teardown also cancels capture.
    function beginWindowGesture(event, record, edge) {
        if (event.button !== 0 || !event.isPrimary || narrow.matches || event.target.closest('button')) return;
        finishWindowGesture();
        focus(record, false);
        cancelAnimation(record);
        if (edge && record.mode === 'maximized') return;
        const target = event.currentTarget;
        activeGesture = { record, edge, id: event.pointerId, target, startX: event.clientX, startY: event.clientY, rect: rectOf(record.win), moved: false, snap: null };
        target.setPointerCapture(event.pointerId);
        record.win.classList.add('is-dragging');
        event.preventDefault();
    }
    function finishWindowGesture(record, cancel = true) {
        const gesture = activeGesture;
        if (!gesture || (record && gesture.record !== record)) return;
        activeGesture = null;
        $('snap-preview').hidden = true;
        gesture.record.win.classList.remove('is-dragging');
        try { if (gesture.target.hasPointerCapture(gesture.id)) gesture.target.releasePointerCapture(gesture.id); } catch (_) { /* pointer ended */ }
        if (!cancel && gesture.moved) {
            if (gesture.snap) {
                saveRect(gesture.record);
                gesture.record.mode = gesture.snap;
                layout(gesture.record);
            } else saveRect(gesture.record);
        }
    }
    document.addEventListener('pointermove', event => {
        const gesture = activeGesture;
        if (!gesture || event.pointerId !== gesture.id) return;
        const { record, edge } = gesture;
        let dx = event.clientX - gesture.startX;
        let dy = event.clientY - gesture.startY;
        if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
        if (!gesture.moved && record.mode !== 'normal') {
            const ratio = clamp((gesture.startX - gesture.rect.x) / gesture.rect.w, 0, 1);
            record.mode = 'normal';
            if (!edge) {
                record.normal.x = event.clientX - record.normal.w * ratio;
                record.normal.y = event.clientY - 18;
                layout(record);
                gesture.rect = rectOf(record.win);
                gesture.startX = event.clientX;
                gesture.startY = event.clientY;
                dx = 0; dy = 0;
            } else record.normal = { ...gesture.rect };
        }
        gesture.moved = true;
        const r = gesture.rect;
        const area = viewport();
        if (!edge) {
            paintRect(record, bounds({ ...r, x: r.x + dx, y: r.y + dy }, record.app));
            gesture.snap = event.clientY <= 12 ? 'maximized' : event.clientX <= 12 ? 'left' : event.clientX >= area.w - 12 ? 'right' : null;
            const preview = $('snap-preview');
            preview.hidden = !gesture.snap;
            if (gesture.snap) {
                const p = modeRect(gesture.snap);
                Object.assign(preview.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' });
            }
        } else {
            const minW = Math.min(record.app.minSize.w, area.w), minH = Math.min(record.app.minSize.h, area.h);
            let left = r.x, top = r.y, right = r.x + r.w, bottom = r.y + r.h;
            if (edge.includes('w')) left = clamp(r.x + dx, 0, right - minW);
            if (edge.includes('e')) right = clamp(r.x + r.w + dx, left + minW, area.w);
            if (edge.includes('n')) top = clamp(r.y + dy, 0, bottom - minH);
            if (edge.includes('s')) bottom = clamp(r.y + r.h + dy, top + minH, area.h);
            paintRect(record, { x: left, y: top, w: right - left, h: bottom - top });
        }
    });
    document.addEventListener('pointerup', event => { if (activeGesture?.id === event.pointerId) finishWindowGesture(null, false); });
    document.addEventListener('pointercancel', event => { if (activeGesture?.id === event.pointerId) finishWindowGesture(); });
    document.addEventListener('lostpointercapture', event => { if (activeGesture?.id === event.pointerId) finishWindowGesture(); });

    function openFile(path) {
        const info = fs.get(path);
        if (!info) return null;
        const ext = info.name.includes('.') ? info.name.slice(info.name.lastIndexOf('.') + 1).toLowerCase() : '';
        const appId = info.type === 'folder' ? (handlers.get('folder') || (apps.has('files') ? 'files' : null)) : (handlers.get(ext) || handlers.get('*'));
        if (appId && apps.has(appId)) return openApp(appId, { path: info.path });
        notify({ title: 'No application available', body: 'No handler is registered for ' + info.name + '.' });
        return null;
    }
    const selectedIcons = new Set();
    function selectIcon(icon, additive) {
        if (!additive) selectedIcons.clear();
        if (icon) selectedIcons.add(icon.dataset.key);
        updateSelection();
    }
    function updateSelection() {
        icons.querySelectorAll('.desktop-icon').forEach(icon => {
            const selected = selectedIcons.has(icon.dataset.key);
            icon.classList.toggle('is-selected', selected);
            icon.setAttribute('aria-pressed', String(selected));
        });
    }
    function iconRect(position) {
        const area = viewport();
        const cols = Math.max(1, Math.floor((area.w - 16) / 100));
        const rows = Math.max(1, Math.floor((area.h - 16) / 96));
        return { col: clamp(Math.round(finite(position?.col, 0)), 0, cols - 1), row: clamp(Math.round(finite(position?.row, 0)), 0, rows - 1), cols, rows };
    }
    function placeIcons() {
        const occupied = new Set();
        Array.from(icons.children).forEach(icon => {
            let pos = iconRect(iconPositions[icon.dataset.key]);
            if (occupied.has(pos.col + ':' + pos.row)) {
                for (let i = 0; i < pos.cols * pos.rows; i++) {
                    const col = Math.floor(i / pos.rows), row = i % pos.rows;
                    if (!occupied.has(col + ':' + row)) { pos = { ...pos, col, row }; break; }
                }
            }
            occupied.add(pos.col + ':' + pos.row);
            icon.style.left = 8 + pos.col * 100 + 'px';
            icon.style.top = 8 + pos.row * 96 + 'px';
        });
    }
    function renderDesktop() {
        if (desktopGesture) { desktopRefreshPending = true; return; }
        desktopRefreshPending = false;
        const focusedKey = icons.contains(document.activeElement) ? document.activeElement.dataset.key : null;
        icons.replaceChildren();
        const entries = [...apps.values()].filter(app => app.desktop).map(app => ({ key: 'app:' + app.id, title: app.title, icon: app.icon, open: () => openApp(app.id) }));
        for (const file of fs.list('/home/lennox/Desktop') || []) entries.push({ key: 'file:' + file.path, title: file.name, icon: fileIcon, open: () => openFile(file.path) });
        entries.forEach(entry => {
            const icon = button('', 'desktop-icon');
            icon.dataset.key = entry.key;
            if (entry.key.startsWith('app:')) icon.dataset.app = entry.key.slice(4);
            icon.append(svgSlot(entry.icon));
            const label = document.createElement('span'); label.textContent = entry.title; icon.append(label);
            icon.title = entry.title;
            icon.setAttribute('aria-haspopup', 'dialog');
            icon.addEventListener('click', event => {
                if (iconClickSuppressed) return;
                selectIcon(icon, event.ctrlKey || event.metaKey);
                // Keyboard activation (Enter/Space) produces a zero-detail click.
                if (event.detail === 0 || event.pointerType === 'touch') entry.open();
            });
            icon.addEventListener('dblclick', event => { if (!iconClickSuppressed && event.pointerType !== 'touch') entry.open(); });
            icon.addEventListener('pointerdown', event => beginDesktopGesture(event, icon, entry.open));
            icon.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); selectIcon(icon, false); contextMenu(event.clientX, event.clientY, [{ label: 'Open', action: entry.open }]); });
            icons.append(icon);
        });
        const valid = new Set(entries.map(entry => entry.key));
        for (const key of selectedIcons) if (!valid.has(key)) selectedIcons.delete(key);
        placeIcons(); updateSelection();
        if (focusedKey) Array.from(icons.children).find(icon => icon.dataset.key === focusedKey)?.focus({ preventScroll: true });
    }
    function beginDesktopGesture(event, icon, open) {
        if (event.button !== 0 || !event.isPrimary || activeGesture) return;
        hideMenus();
        if (icon && !selectedIcons.has(icon.dataset.key)) selectIcon(icon, event.ctrlKey || event.metaKey);
        if (!icon && !event.ctrlKey && !event.metaKey) selectIcon(null, false);
        const items = Array.from(icons.children).filter(item => selectedIcons.has(item.dataset.key)).map(item => ({ item, x: item.offsetLeft, y: item.offsetTop }));
        desktopGesture = { id: event.pointerId, target: event.currentTarget, icon, open, x: event.clientX, y: event.clientY, items, moved: false, additive: new Set(selectedIcons), touch: event.pointerType === 'touch' };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (!icon) event.preventDefault();
    }
    icons.addEventListener('pointerdown', event => { if (event.target === icons) beginDesktopGesture(event, null, null); });
    desktop.addEventListener('contextmenu', event => {
        if (event.target !== desktop && event.target !== icons && event.target !== windowLayer) return;
        event.preventDefault();
        contextMenu(event.clientX, event.clientY, [
            { label: 'Refresh', action: () => { renderDesktop(); notify({ title: 'Desktop refreshed', body: 'Workspace is up to date.' }); } },
            { label: 'Change wallpaper', disabled: !apps.has('settings'), action: () => openApp('settings', { section: 'wallpaper' }) },
            { label: 'Open Terminal', disabled: !apps.has('terminal'), action: () => openApp('terminal') },
            { separator: true },
            { label: 'About Lennox_OS', action: () => notify({ title: 'Lennox_OS', body: 'Lennox Nordmann — Systems Architect // AI Infrastructure.\nA local-first desktop workspace in your browser.' }) }
        ]);
    });
    document.addEventListener('pointermove', event => {
        const gesture = desktopGesture;
        if (!gesture || event.pointerId !== gesture.id) return;
        const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
        if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
        gesture.moved = true;
        if (gesture.icon) {
            // Clamp the group as one rectangle to retain its relative layout.
            const area = viewport();
            const minX = Math.min(...gesture.items.map(item => item.x)), maxX = Math.max(...gesture.items.map(item => item.x + 96));
            const minY = Math.min(...gesture.items.map(item => item.y)), maxY = Math.max(...gesture.items.map(item => item.y + 90));
            const shiftX = clamp(dx, -minX, area.w - maxX), shiftY = clamp(dy, -minY, area.h - maxY);
            for (const { item, x, y } of gesture.items) { item.style.left = x + shiftX + 'px'; item.style.top = y + shiftY + 'px'; }
        } else {
            const box = $('selection-box');
            const x = Math.min(event.clientX, gesture.x), y = Math.min(event.clientY, gesture.y), w = Math.abs(dx), h = Math.abs(dy);
            box.hidden = false;
            Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
            selectedIcons.clear();
            for (const key of gesture.additive) selectedIcons.add(key);
            for (const icon of icons.children) {
                const r = icon.getBoundingClientRect();
                if (r.left < x + w && r.right > x && r.top < y + h && r.bottom > y) selectedIcons.add(icon.dataset.key);
            }
            updateSelection();
        }
    });
    function endDesktopGesture(event, cancelled = false) {
        const gesture = desktopGesture;
        if (!gesture || event.pointerId !== gesture.id) return;
        desktopGesture = null;
        $('selection-box').hidden = true;
        if (gesture.moved && gesture.icon && !cancelled) {
            for (const { item } of gesture.items) iconPositions[item.dataset.key] = { col: Math.round((item.offsetLeft - 8) / 100), row: Math.round((item.offsetTop - 8) / 96) };
            store('icons', iconPositions);
        }
        if (gesture.moved || gesture.touch) {
            iconClickSuppressed = true;
            setTimeout(() => { iconClickSuppressed = false; }, 0);
        }
        if (!cancelled && gesture.touch && gesture.icon && !gesture.moved) gesture.open();
        try { if (gesture.target.hasPointerCapture(gesture.id)) gesture.target.releasePointerCapture(gesture.id); } catch (_) { /* pointer ended */ }
        if (desktopRefreshPending) renderDesktop();
        else { placeIcons(); updateSelection(); }
    }
    document.addEventListener('pointerup', event => endDesktopGesture(event));
    document.addEventListener('pointercancel', event => endDesktopGesture(event, true));
    document.addEventListener('lostpointercapture', event => endDesktopGesture(event, true));

    function hideMenus(returnFocus = false) {
        const wasContext = !menu.hidden;
        const wasStart = !startMenu.hidden;
        const wasCenter = !center.hidden;
        menu.hidden = true; startMenu.hidden = true; center.hidden = true;
        $('start-button').setAttribute('aria-expanded', 'false');
        $('notification-button').setAttribute('aria-expanded', 'false');
        if (returnFocus) {
            if (wasContext && menuOpener?.isConnected) menuOpener.focus({ preventScroll: true });
            else if (wasStart) $('start-button').focus();
            else if (wasCenter) $('notification-button').focus();
        }
        return wasContext || wasStart || wasCenter;
    }
    function contextMenu(x, y, items) {
        menuOpener = document.activeElement;
        hideMenus();
        menu.replaceChildren();
        for (const item of items) {
            if (item.separator) { const hr = document.createElement('hr'); hr.setAttribute('role', 'separator'); menu.append(hr); continue; }
            const option = button(String(item.label || ''), '', () => { hideMenus(true); if (typeof item.action === 'function') item.action(); });
            option.setAttribute('role', 'menuitem');
            option.disabled = Boolean(item.disabled);
            menu.append(option);
        }
        menu.hidden = false;
        const area = viewport();
        menu.style.left = clamp(finite(x, 0), 4, area.w - menu.offsetWidth - 4) + 'px';
        menu.style.top = clamp(finite(y, 0), 4, area.h - menu.offsetHeight - 4) + 'px';
        menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
        return menu;
    }
    menu.addEventListener('keydown', event => {
        const options = Array.from(menu.querySelectorAll('button:not(:disabled)'));
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !options.length) return;
        event.preventDefault();
        const index = options.indexOf(document.activeElement);
        options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
    });
    function renderStart() {
        const list = $('start-apps'); list.replaceChildren();
        const query = search.value.trim().toLocaleLowerCase();
        for (const app of apps.values()) {
            if (!app.startMenu || !(app.title + ' ' + app.id).toLocaleLowerCase().includes(query)) continue;
            const entry = button('', 'start-app', () => openApp(app.id));
            entry.dataset.app = app.id;
            entry.append(svgSlot(app.icon), document.createTextNode(app.title));
            list.append(entry);
        }
        if (!list.children.length) { const empty = document.createElement('p'); empty.textContent = 'No applications found.'; empty.style.padding = '12px'; list.append(empty); }
    }
    function toggleStart() {
        const opening = startMenu.hidden;
        hideMenus();
        if (!opening || bootState === 'idle') return;
        search.value = ''; renderStart();
        startMenu.hidden = false;
        $('start-button').setAttribute('aria-expanded', 'true');
        search.focus();
    }
    $('start-button').addEventListener('click', toggleStart);
    search.addEventListener('input', renderStart);
    search.addEventListener('keydown', event => {
        if (event.key === 'Enter') $('start-apps').querySelector('button')?.click();
        if (event.key === 'ArrowDown') { event.preventDefault(); $('start-apps').querySelector('button')?.focus(); }
    });
    document.addEventListener('pointerdown', event => {
        if (event.target.closest('#start-menu,#notification-center,#context-menu,#start-button,#notification-button')) return;
        hideMenus();
    });
    function notificationNode(notice) {
        const node = document.createElement('article'); node.className = 'notification';
        const heading = document.createElement('strong');
        if (notice.icon) heading.append(svgSlot(notice.icon, 'notice-icon'));
        heading.append(document.createTextNode(notice.title));
        const body = document.createElement('p'); body.textContent = notice.body;
        const time = document.createElement('time'); time.dateTime = new Date(notice.time).toISOString(); time.textContent = new Date(notice.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        node.append(heading, body, time); return node;
    }
    function renderNotifications() {
        $('notification-count').textContent = notices.length ? String(notices.length) : '';
        const list = $('notification-list'); list.replaceChildren();
        notices.slice().reverse().forEach(notice => list.append(notificationNode(notice)));
        if (!notices.length) { const empty = document.createElement('p'); empty.textContent = 'No notifications. All systems nominal.'; list.append(empty); }
    }
    function notify({ title = 'Lennox_OS', body = '', icon = '' } = {}) {
        const notice = { id: ++sequence, title: String(title), body: String(body), icon, time: Date.now() };
        notices.push(notice);
        if (notices.length > 100) notices.shift();
        renderNotifications();
        const toast = notificationNode(notice); toast.classList.add('toast');
        const dismiss = button('×', 'dismiss', () => toast.remove()); dismiss.setAttribute('aria-label', 'Dismiss notification'); toast.append(dismiss);
        $('toast-region').append(toast);
        while ($('toast-region').children.length > 3) $('toast-region').firstElementChild.remove();
        setTimeout(() => toast.remove(), 6000);
        return notice.id;
    }
    $('notification-button').addEventListener('click', () => {
        const opening = center.hidden; hideMenus();
        if (opening) { center.hidden = false; $('notification-button').setAttribute('aria-expanded', 'true'); $('clear-notifications').focus(); }
    });
    $('clear-notifications').addEventListener('click', () => { notices.length = 0; $('toast-region').replaceChildren(); renderNotifications(); });
    renderNotifications();
    function tick() {
        const now = new Date();
        $('clock').dateTime = now.toISOString();
        $('clock').textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '\n' + now.toLocaleDateString('de-DE');
        $('clock').title = now.toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' });
    }
    tick(); setInterval(tick, 1000);
    function networkStatus() {
        const label = navigator.onLine ? 'Network connected' : 'Offline — local workspace available';
        $('network-icon').title = label; $('network-icon').setAttribute('aria-label', label);
        $('network-icon').style.opacity = navigator.onLine ? '1' : '.4';
    }
    networkStatus(); window.addEventListener('online', networkStatus); window.addEventListener('offline', networkStatus);

    // Assistant: one utterance owns all audio and typewriter callbacks.
    const introLine = 'System override initialized. Welcome to the Lennox Nordmann interface. I am your local assistant construct... Please, explore the workspace.';
    let typeTimer = null, hideTimer = null, utterance = 0, hasSpoken = false;
    function setSpeaking(on) { $('ai-assistant').classList.toggle('is-speaking', on); $('ai-assistant').setAttribute('aria-label', on ? 'AI assistant: stop speaking' : 'AI assistant: poke'); }
    function stopSpeech() {
        utterance++; clearInterval(typeTimer); clearTimeout(hideTimer);
        if (currentAudio) {
            currentAudio.onended = null; currentAudio.onerror = null; currentAudio.pause();
            try { currentAudio.currentTime = 0; } catch (_) { /* not loaded */ }
            currentAudio = null;
        }
        setSpeaking(false);
    }
    function say(text, audioSrc) {
        text = String(text); hasSpoken = true; stopSpeech();
        const token = ++utterance;
        let typingDone = false, silent = !audioSrc;
        const finish = delay => {
            if (token !== utterance) return;
            setSpeaking(false); clearTimeout(hideTimer);
            hideTimer = setTimeout(() => $('speech-bubble').classList.remove('active'), delay);
        };
        const finishSilent = () => { if (silent && typingDone) finish(4000); };
        $('speech-bubble').classList.add('active');
        setSpeaking(true);
        $('sr-announce').textContent = '';
        requestAnimationFrame(() => { if (token === utterance) $('sr-announce').textContent = text; });
        if (audioSrc) {
            const sourceURL = new URL(audioSrc, document.baseURI).href;
            const audio = Array.from(document.querySelectorAll('audio')).find(item => item.src === sourceURL) || new Audio(audioSrc);
            currentAudio = audio; applyAudio(audio);
            audio.onended = () => finish(3000);
            audio.onerror = () => { silent = true; finishSilent(); };
            const playing = audio.play();
            if (playing) playing.catch(() => { if (token === utterance) { silent = true; finishSilent(); } });
        }
        if (reduced.matches) { $('speech-bubble').textContent = text; typingDone = true; finishSilent(); return; }
        let index = 0; $('speech-bubble').textContent = '';
        typeTimer = setInterval(() => {
            if (token !== utterance) return;
            $('speech-bubble').textContent = text.slice(0, ++index);
            if (index >= text.length) { clearInterval(typeTimer); typingDone = true; finishSilent(); }
        }, 30);
    }
    let pokeCount = 0, pokeResetTimer;
    $('ai-assistant').addEventListener('click', () => {
        if ($('ai-assistant').classList.contains('is-speaking')) { stopSpeech(); hideTimer = setTimeout(() => $('speech-bubble').classList.remove('active'), 1500); return; }
        $('ai-assistant').classList.remove('poke'); void $('ai-assistant').offsetWidth; $('ai-assistant').classList.add('poke');
        pokeCount++; clearTimeout(pokeResetTimer); pokeResetTimer = setTimeout(() => { pokeCount = 0; }, 1500);
        if (pokeCount >= 7) { pokeCount = 0; enterNexus(); }
    });
    $('ai-assistant').addEventListener('animationend', () => $('ai-assistant').classList.remove('poke'));
    function boot() {
        if (bootState !== 'idle') return;
        const generation = ++bootGeneration; bootState = 'booting';
        $('boot-screen').hidden = false; $('boot-screen').classList.add('is-leaving'); $('boot-screen').inert = true;
        desktop.classList.remove('is-shutting-down'); desktop.classList.add('is-on'); desktop.inert = false;
        (icons.querySelector('button') || $('start-button')).focus({ preventScroll: true });
        setTimeout(() => {
            if (generation !== bootGeneration) return;
            $('boot-screen').hidden = true; bootState = 'ready';
            setTimeout(() => {
                if (generation !== bootGeneration) return;
                $('ai-assistant').classList.add('visible');
                if (!hasSpoken) say(introLine, 'audio/intro.ogg');
            }, reduced.matches ? 150 : 800);
        }, reduced.matches ? 50 : 1500);
    }
    function power(restart) {
        if (bootState === 'idle' || bootState === 'shutdown') return;
        bootState = 'shutdown'; ++bootGeneration;
        hideMenus(); finishWindowGesture();
        if (desktopGesture) endDesktopGesture({ pointerId: desktopGesture.id }, true);
        stopSpeech(); hasSpoken = false; pokeCount = 0; clearTimeout(pokeResetTimer);
        document.querySelectorAll('audio,video').forEach(media => media.pause());
        for (const record of [...stack]) closeWindow(record.win);
        $('ai-assistant').classList.remove('visible'); $('speech-bubble').classList.remove('active');
        desktop.inert = true; desktop.classList.add('is-shutting-down');
        setTimeout(() => {
            desktop.classList.remove('is-on', 'is-shutting-down');
            $('boot-screen').hidden = false; $('boot-screen').inert = false; $('boot-screen').classList.remove('is-leaving');
            bootState = 'idle'; $('boot-btn').focus();
            if (restart) setTimeout(boot, reduced.matches ? 0 : 300);
        }, reduced.matches ? 0 : 450);
    }
    $('boot-btn').addEventListener('click', boot);
    $('shutdown-button').addEventListener('click', () => power(false));
    $('restart-button').addEventListener('click', () => power(true));
    let resizeFrame;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => { finishWindowGesture(); stack.forEach(layout); placeIcons(); hideMenus(); });
    });
    window.addEventListener('blur', () => { finishWindowGesture(); if (desktopGesture) endDesktopGesture({ pointerId: desktopGesture.id }, true); });
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0, leaving = false;
    document.addEventListener('keydown', event => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (key === konami[konamiIndex]) { if (++konamiIndex === konami.length) { konamiIndex = 0; enterNexus(); } }
        else konamiIndex = key === konami[0] ? 1 : 0;
        if (bootState === 'idle' || bootState === 'shutdown') return;
        if (event.key === 'Escape') {
            event.preventDefault();
            if (hideMenus(true)) return;
            const record = topRecord();
            if (record) closeWindow(record.win);
            else { stopSpeech(); $('speech-bubble').classList.remove('active'); }
        } else if (event.key === 'Meta' && !event.repeat) { event.preventDefault(); toggleStart(); }
        else if (event.altKey && (key === 'w' || key === 'm')) {
            event.preventDefault(); const record = topRecord();
            if (record) { if (key === 'w') closeWindow(record.win); else minimize(record); }
        } else if (!startMenu.hidden && event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && event.target !== search && !event.target.matches('input,textarea,[contenteditable="true"]')) {
            event.preventDefault(); search.focus(); search.value += event.key; renderStart();
        }
    });
    function enterNexus() {
        if (leaving) return;
        leaving = true; stopSpeech(); document.body.classList.add('glitch-out');
        setTimeout(() => { location.href = 'nexus.html'; }, reduced.matches ? 0 : 600);
    }
    window.addEventListener('pageshow', event => { if (event.persisted) { leaving = false; document.body.classList.remove('glitch-out'); } });

    window.LennoxOS = Object.freeze({
        registerApp, openApp, closeWindow, notify, contextMenu, say, settings, fs, wallpapers,
        setWallpaper(id) { return settings.set('wallpaper', id); },
        registerFileHandler(ext, appId) {
            if (typeof ext !== 'string' || typeof appId !== 'string' || !appId) return false;
            const extension = ext.trim().replace(/^\./, '').toLowerCase();
            if (!extension) return false;
            handlers.set(extension, appId); return true;
        },
        openFile,
        addEventListener(...args) { events.addEventListener(...args); },
        removeEventListener(...args) { events.removeEventListener(...args); }
    });
    renderDesktop(); renderStart();
})();
