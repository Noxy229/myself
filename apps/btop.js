(() => {
    'use strict';
    const os = window.LennoxOS;
    const pageStarted = performance.timeOrigin;
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const random = (lo, hi) => lo + Math.random() * (hi - lo);
    const walk = (value, target, spread, lo, hi) => clamp(value + (target - value) * .17 + random(-spread, spread), lo, hi);
    const node = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    };
    function installStyle() {
        if (document.getElementById('app-btop-style')) return;
        const style = node('style');
        style.id = 'app-btop-style';
        style.textContent = `
.lx-btop{--bt-high:var(--accent);--bt-mid:color-mix(in srgb,var(--accent) 65%,var(--text-bright));--bt-low:color-mix(in srgb,var(--accent) 30%,var(--text-bright));--bt-line:color-mix(in srgb,var(--accent) 45%,var(--window-border));box-sizing:border-box;position:relative;min-height:100%;padding:7px;background:var(--window-bg);color:var(--text-bright);font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;line-height:1.25;outline:none}
.lx-btop *{box-sizing:border-box;font-family:inherit;line-height:1.25}
.lx-btop [hidden]{display:none!important}
.lx-btop button,.lx-btop input{font:inherit;color:inherit;background:transparent;border:1px solid var(--bt-line);border-radius:4px;padding:4px 7px}
.lx-btop button{cursor:pointer}
.lx-btop button:hover,.lx-btop button:focus-visible{color:var(--bt-low);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.lx-btop button:focus-visible,.lx-btop input:focus-visible,.lx-btop .bt-table:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.lx-btop button:disabled{opacity:.4;cursor:default}
.lx-btop .bt-toolbar,.lx-btop .bt-brand,.lx-btop .bt-filterbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.lx-btop .bt-toolbar{justify-content:space-between;margin-bottom:8px}
.lx-btop .bt-logo{font-size:21px;font-weight:800;letter-spacing:-2px;color:var(--bt-low);line-height:1}
.lx-btop .bt-mode{color:var(--bt-low);border-color:var(--accent)}
.lx-btop .bt-muted{color:var(--text-dim)}
.lx-btop .bt-host{font-weight:bold;color:var(--bt-low)}
.lx-btop .bt-info{margin-bottom:6px;padding:4px 7px;border:1px solid var(--window-border);border-radius:5px;display:flex;gap:3px 20px;flex-wrap:wrap;color:var(--text-dim)}
.lx-btop .bt-info span{overflow-wrap:anywhere}
.lx-btop .bt-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:8px;align-items:start}
.lx-btop .bt-panel{min-width:0;margin:0;padding:3px 7px 6px;border:1px solid var(--bt-line);border-radius:9px}
.lx-btop .bt-panel legend{padding:0 7px;color:var(--bt-low);font-weight:bold;max-width:100%;overflow-wrap:anywhere}
.lx-btop .bt-panel legend::before{content:'╭─ ';color:var(--accent)}
.lx-btop .bt-panel legend::after{content:' ─╮';color:var(--accent)}
.lx-btop .bt-panelhead{display:flex;justify-content:space-between;gap:4px;flex-wrap:wrap;margin-bottom:2px}
.lx-btop .bt-model{color:var(--text-bright);font-weight:600;overflow-wrap:anywhere}
.lx-btop .bt-value{color:var(--bt-low);white-space:pre-wrap}
.lx-btop .bt-graph{margin:2px 0;white-space:pre;overflow:hidden;font:12px/1 ui-monospace,Consolas,monospace;letter-spacing:0;color:var(--bt-low);user-select:none}
.lx-btop .bt-graph span{display:block;height:10px;line-height:10px}
.lx-btop .bt-graph span:nth-child(1){color:var(--bt-high)}
.lx-btop .bt-graph span:nth-child(2){color:var(--bt-mid)}
.lx-btop .bt-graph span:nth-child(3){color:var(--bt-low)}
.lx-btop .bt-threads{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 9px;margin-top:3px}
.lx-btop .bt-thread{display:grid;grid-template-columns:35px minmax(18px,1fr) 30px 42px;gap:4px;align-items:center;font-size:10px;line-height:1.3}
.lx-btop .bt-threadlabel{color:var(--text-dim)}
.lx-btop .bt-meter{height:6px;background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:1px;overflow:hidden}
.lx-btop .bt-fill{height:100%;background:linear-gradient(90deg,var(--bt-low),var(--bt-mid),var(--bt-high));min-width:0}
.lx-btop .bt-thread .bt-value{text-align:right;white-space:nowrap}
.lx-btop .bt-side{font-size:10px;display:grid;grid-column:1/-1;grid-row:2;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;min-width:0}
.lx-btop .bt-cpu{grid-column:1;grid-row:1}
.lx-btop .bt-network{grid-column:1/-1;grid-row:3;display:grid;grid-template-columns:1fr 1fr;column-gap:14px;font-size:10px}
.lx-btop .bt-network .bt-muted{grid-column:1/-1}
.lx-btop .bt-network .bt-graph{grid-row:3;margin:2px 0}
.lx-btop .bt-network>.bt-value{grid-row:2}
.lx-btop .bt-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px 5px;color:var(--text-dim);font-size:10px}
.lx-btop .bt-stats span{overflow-wrap:anywhere}
.lx-btop .bt-memoryrow{display:grid;grid-template-columns:46px minmax(20px,1fr) 73px;gap:7px;align-items:center;margin:2px 0}
.lx-btop .bt-memoryrow .bt-value{text-align:right}
.lx-btop .bt-disk{margin-top:4px}
.lx-btop .bt-procs{grid-column:2;grid-row:1}
.lx-btop .bt-filterbar{justify-content:space-between;margin-bottom:6px}
.lx-btop .bt-filterwrap{display:flex;align-items:center;gap:6px;flex:1;min-width:130px}
.lx-btop .bt-filterwrap input{min-width:0;width:100%;max-width:230px}
.lx-btop .bt-scroll{max-height:var(--bt-process-height,185px);overflow:auto;scrollbar-width:thin;scrollbar-color:var(--bt-line) transparent}
.lx-btop .bt-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
.lx-btop .bt-table th{position:sticky;top:0;background:var(--window-bg);z-index:1;text-align:right;border-bottom:1px solid var(--bt-line)}
.lx-btop .bt-table th button{border:0;border-radius:0;width:100%;text-align:inherit;padding:4px}
.lx-btop .bt-table th:first-child{width:61px}
.lx-btop .bt-table th:nth-child(2){width:auto;text-align:left}
.lx-btop .bt-table th:nth-child(3){width:70px}
.lx-btop .bt-table th:nth-child(4){width:77px}
.lx-btop .bt-table td{padding:3px 5px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid color-mix(in srgb,var(--window-border) 45%,transparent)}
.lx-btop .bt-table td:nth-child(2){text-align:left}
.lx-btop .bt-table tr{cursor:pointer}
.lx-btop .bt-table tr[aria-selected=true]{background:color-mix(in srgb,var(--accent) 22%,var(--window-bg));color:var(--bt-low)}
.lx-btop .bt-table tr.bt-real td:nth-child(2)::before{content:'● ';color:var(--accent)}
.lx-btop .bt-status{color:var(--text-dim);margin-top:5px;min-height:16px}
.lx-btop .bt-footer{margin-top:5px;padding-top:3px;font-size:10px;border-top:1px solid var(--window-border);color:var(--text-dim);display:flex;flex-wrap:wrap;gap:4px 16px}
.lx-btop .bt-footer b{color:var(--bt-low);font-weight:normal}
.lx-btop .bt-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:9px}
.lx-btop .bt-card{padding:10px;border:1px solid var(--bt-line);border-radius:7px;min-width:0}
.lx-btop .bt-card strong{display:block;font-size:23px;color:var(--bt-low);margin:3px 0}
.lx-btop .bt-card small{color:var(--text-dim);display:block;overflow-wrap:anywhere}
.lx-btop.bt-task .bt-procs{border-radius:6px;grid-column:1/-1;grid-row:auto}
.lx-btop.bt-task .bt-table td{padding:7px 6px}
.lx-btop.bt-task .bt-scroll{max-height:370px}
.lx-btop.bt-narrow .bt-grid{grid-template-columns:minmax(0,1fr)}
.lx-btop.bt-narrow .bt-side,.lx-btop.bt-narrow .bt-cpu,.lx-btop.bt-narrow .bt-network,.lx-btop.bt-narrow .bt-procs{grid-column:auto;grid-row:auto}
.lx-btop.bt-narrow .bt-side{grid-template-columns:minmax(0,1fr)}
.lx-btop.bt-narrow .bt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.lx-btop.bt-narrow .bt-cards{grid-template-columns:repeat(2,minmax(0,1fr))}
.lx-btop.bt-tiny .bt-threads{grid-template-columns:minmax(0,1fr)}
.lx-btop.bt-tiny .bt-stats{grid-template-columns:minmax(0,1fr)}
.lx-btop .bt-panic{position:absolute;inset:0;z-index:5;min-height:100%;width:100%;border:0;border-radius:0;background:var(--desktop-bg);color:var(--bt-low);padding:25px;text-align:left;display:flex;flex-direction:column;justify-content:center;gap:16px;white-space:pre-wrap;overflow-wrap:anywhere}
.lx-btop .bt-panic strong{font-size:20px}
`;
        document.head.append(style);
    }
    os.registerApp({
        id: 'btop', title: 'btop', desktop: true, startMenu: true, multiInstance: false,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v16H3zM3 8h18" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 17v-4h2v4zm5 0v-7h2v7zm5 0v-5h2v5z" fill="currentColor"/></svg>',
        defaultSize: { w: 900, h: 600 }, minSize: { w: 300, h: 300 },
        onOpen(ctx) {
            installStyle();
            ctx.body.style.padding = '0';
            const root = node('div', 'lx-btop');
            ctx.body.append(root);
            const abort = new AbortController();
            const listen = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
            let closed = false, taskMode = false, paused = false, panic = false;
            let tickCount = 0, selected = null, sortKey = 'cpu', sortDirection = -1;
            let pid = 2100, columns = 45;
            const histories = {};
            const graphs = [];
            const services = [];
            const windows = new Map();
            const cpuThreads = Array.from({ length: 20 }, (_, i) => ({ load: random(8, 45), frequency: 0, core: i < 12 ? Math.floor(i / 2) : i - 6 }));
            const state = { cpu: 24, gpu: 32, cpuTemp: 49, gpuTemp: 48, memory: 12.4, cached: 5.1, vram: 5.8, down: 2.5, up: .6, diskRead: 18, diskWrite: 9, battery: 87 };
            const toolbar = node('div', 'bt-toolbar');
            const brand = node('div', 'bt-brand');
            brand.append(node('span', 'bt-logo', 'btop'), node('span', 'bt-host', 'lennox-os'), node('span', 'bt-muted', 'SIMULATED · 1s'));
            const controls = node('div', 'bt-brand');
            const modeButton = node('button', 'bt-mode', 'Task Manager');
            modeButton.type = 'button';
            modeButton.setAttribute('aria-pressed', 'false');
            const pauseButton = node('button', '', 'Pause');
            pauseButton.type = 'button';
            pauseButton.setAttribute('aria-pressed', 'false');
            controls.append(pauseButton, modeButton);
            toolbar.append(brand, controls);
            root.append(toolbar);
            const info = node('div', 'bt-info');
            const uptime = node('span');
            const fans = node('span');
            const phone = node('span');
            info.append(node('span', '', 'Kernel 6.8.12-pve · simulated Linux'), uptime,
                node('span', '', 'Case: Hyte Y60 · Noctua chromax.black'), fans,
                node('span', '', 'Displays: 3× LG'), phone);
            root.append(info);
            const cards = node('div', 'bt-cards');
            cards.hidden = true;
            const cardValues = {};
            for (const [key, label, description] of [
                ['cpu', 'CPU', 'Intel Core i5-13600KF · 20 threads'],
                ['gpu', 'GPU', 'AMD Radeon RX 9070 XT · 16 GB GDDR6'],
                ['memory', 'Memory', '32 GB DDR5 · dual channel'],
                ['network', 'Ethernet', 'enp5s0 · homelab / 2.5 GbE']
            ]) {
                const card = node('div', 'bt-card');
                const value = node('strong');
                card.append(node('span', '', label), value, node('small', '', description));
                cards.append(card);
                cardValues[key] = value;
            }
            root.append(cards);
            const grid = node('div', 'bt-grid');
            root.append(grid);
            function panel(label, parent = grid, extra = '') {
                const box = node('fieldset', 'bt-panel ' + extra);
                box.append(node('legend', '', label));
                parent.append(box);
                return box;
            }
            function text(parent, className = 'bt-value', initial = '') {
                const el = node('span', className, initial);
                parent.append(el);
                return el;
            }
            function graph(parent, key, max, rows = 3) {
                const el = node('div', 'bt-graph');
                el.setAttribute('role', 'img');
                const lines = Array.from({ length: rows }, () => node('span'));
                el.append(...lines);
                parent.append(el);
                histories[key] = Array.from({ length: 120 }, (_, i) => clamp(state[key] + max * (Math.sin(i * .15) * .08 + random(-.025, .025)), 0, max));
                histories[key][119] = state[key];
                graphs.push({ el, key, max, rows, lines });
                return el;
            }
            function meterRow(parent, label) {
                const row = node('div', 'bt-memoryrow');
                const meter = node('div', 'bt-meter');
                const fill = node('div', 'bt-fill');
                const value = node('span', 'bt-value');
                meter.append(fill);
                row.append(node('span', 'bt-muted', label), meter, value);
                parent.append(row);
                return { fill, value };
            }
            const cpuBox = panel('cpu', grid, 'bt-cpu');
            const cpuHeading = node('div', 'bt-panelhead');
            cpuHeading.append(node('span', 'bt-model', 'Intel Core i5-13600KF'));
            const cpuValue = text(cpuHeading);
            cpuBox.append(cpuHeading, node('div', 'bt-muted', '14 cores · 6P/HT + 8E · 20 threads · base 3.5 / boost 5.1 GHz'));
            graph(cpuBox, 'cpu', 100);
            const cpuMeta = node('div', 'bt-panelhead');
            const cpuClock = text(cpuMeta, 'bt-muted');
            const cpuTemp = text(cpuMeta);
            cpuBox.append(cpuMeta);
            const threads = node('div', 'bt-threads');
            const threadRows = cpuThreads.map((thread, i) => {
                const row = node('div', 'bt-thread');
                const label = i < 12 ? `P${thread.core}.${i % 2}` : `E${thread.core - 6}`;
                row.title = i < 12 ? `P-core ${thread.core}, hardware thread ${i % 2}` : `E-core ${thread.core - 6}`;
                const meter = node('div', 'bt-meter');
                const fill = node('div', 'bt-fill');
                meter.append(fill);
                const load = node('span', 'bt-value');
                const frequency = node('span', 'bt-value');
                row.append(node('span', 'bt-threadlabel', label), meter, load, frequency);
                threads.append(row);
                return { fill, load, frequency };
            });
            cpuBox.append(threads);
            const side = node('div', 'bt-side');
            grid.append(side);
            const gpuBox = panel('gpu', side);
            const gpuHeading = node('div', 'bt-panelhead');
            gpuHeading.append(node('span', 'bt-model', 'AMD Radeon RX 9070 XT'));
            const gpuValue = text(gpuHeading);
            gpuBox.append(gpuHeading, node('div', 'bt-muted', '16 GB GDDR6'));
            graph(gpuBox, 'gpu', 100, 2);
            const gpuStats = node('div', 'bt-stats');
            const gpuData = Array.from({ length: 6 }, () => text(gpuStats, ''));
            gpuBox.append(gpuStats);
            const memoryBox = panel('mem', side);
            const memoryTitle = node('div', 'bt-panelhead');
            memoryTitle.append(node('span', 'bt-model', '32 GB DDR5'));
            const memoryTotal = text(memoryTitle);
            memoryBox.append(memoryTitle);
            const memoryRows = ['Used', 'Cached', 'Free'].map(label => meterRow(memoryBox, label));
            graph(memoryBox, 'memory', 32, 2);
            const diskBox = panel('disks', side);
            const diskRows = [
                { name: 'nvme0n1 / · 1 TB NVMe', used: .64, capacity: '640 / 1000 GB' },
                { name: 'nvme1n1 /srv · 2 TB NVMe', used: .37, capacity: '740 / 2000 GB' }
            ].map(disk => {
                const section = node('div', 'bt-disk');
                section.append(node('div', 'bt-muted', disk.name));
                const row = meterRow(section, `${Math.round(disk.used * 100)}%`);
                row.fill.style.width = `${disk.used * 100}%`;
                row.value.textContent = disk.capacity;
                row.value.style.fontSize = '9px';
                const io = text(section, 'bt-value');
                diskBox.append(section);
                return io;
            });
            const networkBox = panel('net · enp5s0', grid, 'bt-network');
            networkBox.append(node('div', 'bt-muted', '2.5 GbE · 192.168.10.42 · homelab bridge vmbr0'));
            const down = text(networkBox);
            graph(networkBox, 'down', 20, 1);
            const up = text(networkBox);
            graph(networkBox, 'up', 5, 1);
            const transferred = text(networkBox, 'bt-muted');
            let downloaded = 1284, uploaded = 326;
            const processBox = panel('proc', grid, 'bt-procs');
            const filterBar = node('div', 'bt-filterbar');
            const filterWrap = node('label', 'bt-filterwrap');
            const filter = node('input');
            filter.type = 'search';
            filter.placeholder = 'Filter processes…';
            filter.setAttribute('aria-label', 'Filter processes by name or PID');
            filterWrap.append(node('span', 'bt-muted', 'filter'), filter);
            const count = node('span', 'bt-muted');
            const kill = node('button', '', 'Kill selected [k]');
            kill.type = 'button';
            filterBar.append(filterWrap, count, kill);
            processBox.append(filterBar);
            const scroller = node('div', 'bt-scroll');
            const table = node('table', 'bt-table');
            table.tabIndex = 0;
            table.setAttribute('aria-label', 'Processes; use arrow keys to select and Delete to kill');
            const head = node('thead');
            const headings = node('tr');
            const headerButtons = {};
            for (const [key, label] of [['pid', 'PID'], ['name', 'Process'], ['cpu', 'CPU%'], ['mem', 'MEM MiB']]) {
                const th = node('th');
                th.scope = 'col';
                const button = node('button', '', label);
                button.type = 'button';
                headerButtons[key] = { th, button, label };
                listen(button, 'click', () => {
                    sortDirection = sortKey === key ? -sortDirection : key === 'name' || key === 'pid' ? 1 : -1;
                    sortKey = key;
                    renderProcesses();
                });
                th.append(button);
                headings.append(th);
            }
            head.append(headings);
            const tbody = node('tbody');
            table.append(head, tbody);
            scroller.append(table);
            processBox.append(scroller);
            const status = node('div', 'bt-status', '● desktop window · simulated telemetry, not host measurements');
            status.setAttribute('role', 'status');
            processBox.append(status);
            grid.append(cpuBox, processBox, side, networkBox);
            const footer = node('div', 'bt-footer');
            for (const [key, hint] of [['↑↓', 'select'], ['k / Del', 'kill'], ['/', 'filter'], ['v', 'view'], ['p', 'pause'], ['Esc / Alt+W', 'close'], ['Alt+M', 'minimize']]) {
                const item = node('span');
                item.append(node('b', '', key + ' '), document.createTextNode(hint));
                footer.append(item);
            }
            root.append(footer);
            const panicButton = node('button', 'bt-panic');
            panicButton.type = 'button';
            panicButton.hidden = true;
            panicButton.append(node('strong', '', 'KERNEL PANIC — not syncing'),
                node('span', '', 'Attempted to kill init! exitcode=0x00000009\n\nCPU: 0 · PID: 1 · Comm: systemd\nCall Trace: [ simulated portfolio universe ]\n\nNo actual systems were harmed.\nClick or press Enter to reboot this simulation.'));
            root.append(panicButton);
            for (const [name, cpu, mem] of [
                ['systemd', .3, 24], ['proxmox-ve', 2.1, 390], ['dockerd', 1.4, 218], ['containerd', .8, 112],
                ['tailscaled', .4, 68], ['sshd', .1, 12], ['pipewire', .7, 42], ['noctua-fanctl', .2, 18],
                ['clippy-ai', 2.8, 512], ['Xorg/kwin', 1.9, 284], ['pveproxy', .6, 140], ['zfs-zed', .2, 29]
            ]) services.push({ key: 'service:' + name, name, pid: name === 'systemd' ? 1 : ++pid, cpu, base: cpu, mem, respawn: 0 });

            function syncWindows() {
                const live = new Set(document.querySelectorAll('section.window[data-app][data-state]:not(.is-closing)'));
                for (const win of live) {
                    let process = windows.get(win);
                    if (!process) {
                        process = { key: 'window:' + win.id, pid: ++pid, cpu: random(.3, 3), base: random(.5, 2), mem: random(45, 210), win };
                        windows.set(win, process);
                    }
                    process.name = (win.querySelector('.window-title')?.textContent || win.dataset.app) + (win.hidden || win.inert ? ' [sleeping]' : '');
                }
                for (const win of windows.keys()) if (!live.has(win)) windows.delete(win);
            }
            function visibleProcesses() {
                const query = filter.value.trim().toLocaleLowerCase();
                return [...services.filter(process => !process.respawn), ...windows.values()]
                    .filter(process => (process.name + ' ' + process.pid).toLocaleLowerCase().includes(query))
                    .sort((a, b) => (sortKey === 'name' ? a.name.localeCompare(b.name) : a[sortKey] - b[sortKey]) * sortDirection || a.pid - b.pid);
            }
            function renderProcesses() {
                const list = visibleProcesses();
                if (!list.some(process => process.key === selected)) selected = list[0]?.key || null;
                const fragment = document.createDocumentFragment();
                for (const process of list) {
                    const row = node('tr', process.win ? 'bt-real' : '');
                    row.dataset.key = process.key;
                    row.setAttribute('aria-selected', String(process.key === selected));
                    row.title = process.win ? 'Live desktop window — Kill closes this window' : 'Simulated service — automatically respawns';
                    for (const value of [process.pid, process.name, process.cpu.toFixed(1), Math.round(process.mem)]) row.append(node('td', '', value));
                    fragment.append(row);
                }
                if (!list.length) {
                    const row = node('tr');
                    const cell = node('td', '', 'No matching processes');
                    cell.colSpan = 4;
                    row.append(cell);
                    fragment.append(row);
                }
                tbody.replaceChildren(fragment);
                kill.disabled = !selected;
                count.textContent = `${list.length} processes`;
                for (const [key, value] of Object.entries(headerButtons)) {
                    value.th.setAttribute('aria-sort', key !== sortKey ? 'none' : sortDirection === 1 ? 'ascending' : 'descending');
                    value.button.textContent = value.label + (key === sortKey ? sortDirection === 1 ? ' ▴' : ' ▾' : '');
                }
            }
            function killSelected() {
                if (closed || panic) return;
                const process = visibleProcesses().find(item => item.key === selected);
                if (!process) return;
                if (process.win) {
                    os.closeWindow(process.win);
                    if (closed) return;
                    status.textContent = `Closed desktop window: ${process.name}`;
                    syncWindows();
                } else {
                    process.respawn = tickCount + 4;
                    status.textContent = `${process.name} (${process.pid}) terminated; supervisor will restart it.`;
                    os.notify({ title: 'btop · service terminated', body: `${process.name} will respawn in four active simulation seconds.` });
                    if (process.name === 'clippy-ai') os.say('You killed my process? Cute. I have a restart policy and absolutely no respect for your uptime.');
                    if (process.name === 'systemd') {
                        panic = true;
                        panicButton.hidden = false;
                        panicButton.focus();
                    }
                }
                renderProcesses();
            }
            function recover() {
                panic = false;
                panicButton.hidden = true;
                const init = services.find(process => process.name === 'systemd');
                init.respawn = 0;
                init.pid = ++pid;
                status.textContent = 'Simulation recovered. init restarted with a new PID; desktop uptime retained.';
                table.focus();
                renderProcesses();
            }
            function switchView() {
                taskMode = !taskMode;
                root.classList.toggle('bt-task', taskMode);
                cards.hidden = !taskMode;
                for (const el of [cpuBox, side, networkBox]) el.hidden = taskMode;
                modeButton.textContent = taskMode ? 'btop TUI' : 'Task Manager';
                modeButton.setAttribute('aria-pressed', String(taskMode));
                ctx.setTitle(taskMode ? 'Task Manager — lennox-os' : 'btop — lennox-os');
                drawGraphs();
            }
            function togglePause() {
                paused = !paused;
                pauseButton.textContent = paused ? 'Resume' : 'Pause';
                pauseButton.setAttribute('aria-pressed', String(paused));
                status.textContent = paused ? 'Telemetry paused; process controls remain active.' : 'Telemetry resumed · 1 second sample interval';
            }
            function drawGraphs() {
                const blocks = ' ▁▂▃▄▅▆▇█';
                for (const graph of graphs) {
                    const width = clamp(Math.floor((graph.el.clientWidth || columns * 7.2) / 7.2), 12, 120);
                    const samples = histories[graph.key].slice(-width);
                    for (let row = 0; row < graph.rows; row++) {
                        graph.lines[row].textContent = samples.map(value => {
                            const level = value / graph.max * graph.rows - (graph.rows - row - 1);
                            return blocks[clamp(Math.round(level * 8), 0, 8)];
                        }).join('');
                    }
                    graph.el.setAttribute('aria-label', `${graph.key} history, latest ${histories[graph.key].at(-1).toFixed(1)} of ${graph.max}`);
                }
            }
            function renderMetrics() {
                const seconds = Math.max(0, Math.floor((Date.now() - pageStarted) / 1000));
                const h = Math.floor(seconds / 3600), m = Math.floor(seconds / 60) % 60, s = seconds % 60;
                uptime.textContent = `Up ${Math.floor(h / 24)}d ${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                fans.textContent = `Fans: CPU ${Math.round(650 + state.cpuTemp * 11)} · case ${Math.round(430 + state.cpuTemp * 9)} RPM`;
                phone.textContent = `OnePlus 12 · USB connected · ${Math.floor(state.battery)}%`;
                cpuValue.textContent = `${state.cpu.toFixed(0)}%`;
                cpuTemp.textContent = `Package ${state.cpuTemp.toFixed(0)}°C`;
                cpuClock.textContent = `P ${cpuThreads[0].frequency.toFixed(2)} / E ${cpuThreads[12].frequency.toFixed(2)} GHz`;
                cpuThreads.forEach((thread, i) => {
                    const row = threadRows[i];
                    row.fill.style.width = thread.load + '%';
                    row.load.textContent = Math.round(thread.load) + '%';
                    row.frequency.textContent = thread.frequency.toFixed(2) + 'G';
                });
                gpuValue.textContent = `${state.gpu.toFixed(0)}%`;
                const gpuLabels = [`VRAM ${state.vram.toFixed(1)} / 16 GB`, `Temp ${state.gpuTemp.toFixed(0)}°C`,
                    `Fan ${Math.round(600 + state.gpuTemp * 15)} RPM`, `Power ${Math.round(45 + state.gpu * 2.5)} W`,
                    `Clock ${Math.round(950 + state.gpu * 20)} MHz`, 'PCIe · compute'];
                gpuData.forEach((el, i) => { el.textContent = gpuLabels[i]; });
                memoryTotal.textContent = (state.memory / 32 * 100).toFixed(0) + '%';
                [state.memory, state.cached, 32 - state.memory - state.cached].forEach((value, i) => {
                    memoryRows[i].fill.style.width = value / 32 * 100 + '%';
                    memoryRows[i].value.textContent = value.toFixed(1) + ' GiB';
                });
                diskRows.forEach((el, i) => { el.textContent = `R ${(state.diskRead * (i ? .43 : 1)).toFixed(1)} · W ${(state.diskWrite * (i ? .65 : 1)).toFixed(1)} MB/s`; });
                down.textContent = `↓ download ${state.down.toFixed(2)} MiB/s`;
                up.textContent = `↑ upload   ${state.up.toFixed(2)} MiB/s`;
                transferred.textContent = `Session ↓ ${(downloaded / 1024).toFixed(2)} GiB · ↑ ${(uploaded / 1024).toFixed(2)} GiB`;
                cardValues.cpu.textContent = state.cpu.toFixed(0) + '%';
                cardValues.gpu.textContent = state.gpu.toFixed(0) + '%';
                cardValues.memory.textContent = state.memory.toFixed(1) + ' / 32 GB';
                cardValues.network.textContent = `↓ ${state.down.toFixed(1)} MiB/s`;
                drawGraphs();
            }
            function sample() {
                // The shell marks a minimizing window inert before its animation ends.
                if (closed || document.hidden || ctx.win.hidden || ctx.win.inert) return;
                syncWindows();
                if (!paused && !panic) {
                    tickCount++;
                    const activity = 25 + Math.sin(tickCount / 13) * 15 + windows.size * 1.3;
                    const coreClocks = Array.from({ length: 14 }, (_, core) => {
                        const coreLoad = cpuThreads.filter(thread => thread.core === core).reduce((sum, thread, _, list) => sum + thread.load / list.length, 0);
                        return core < 6 ? clamp(3.5 + coreLoad * .025, 3.5, 5.1) : clamp(2.6 + coreLoad * .02, 2.6, 3.9);
                    });
                    cpuThreads.forEach((thread, i) => {
                        thread.load = walk(thread.load, activity + Math.sin(tickCount / 4 + i) * 18, 6, 1, 99);
                        thread.frequency = coreClocks[thread.core];
                    });
                    state.cpu = cpuThreads.reduce((sum, thread) => sum + thread.load, 0) / 20;
                    state.gpu = walk(state.gpu, 29 + Math.sin(tickCount / 18) * 23, 4, 2, 96);
                    state.cpuTemp = walk(state.cpuTemp, 32 + state.cpu * .57, .6, 30, 91);
                    state.gpuTemp = walk(state.gpuTemp, 33 + state.gpu * .49, .4, 31, 88);
                    state.memory = walk(state.memory, 11.4 + windows.size * .24, .08, 8, 23);
                    state.cached = walk(state.cached, 5.4, .05, 3, 6.5);
                    state.vram = walk(state.vram, 3.5 + state.gpu * .065, .08, 1.5, 15.2);
                    state.down = walk(state.down, 4 + Math.sin(tickCount / 9) * 3.5, .7, .02, 20);
                    state.up = walk(state.up, .9 + Math.sin(tickCount / 11) * .7, .15, .01, 5);
                    state.diskRead = walk(state.diskRead, 20 + state.down * 3, 8, .1, 400);
                    state.diskWrite = walk(state.diskWrite, 8 + state.down * 2, 5, .1, 250);
                    state.battery = Math.max(20, state.battery - .0008);
                    downloaded += state.down;
                    uploaded += state.up;
                    for (const key of Object.keys(histories)) {
                        histories[key].push(state[key]);
                        if (histories[key].length > 120) histories[key].shift();
                    }
                    for (const process of [...services, ...windows.values()]) {
                        process.cpu = walk(process.cpu, process.win?.inert ? .05 : process.base, .22, 0, 12);
                        if (process.respawn && tickCount >= process.respawn) {
                            process.respawn = 0;
                            process.pid = ++pid;
                            status.textContent = `${process.name} restarted as PID ${process.pid}.`;
                        }
                    }
                }
                renderMetrics();
                renderProcesses();
            }
            listen(modeButton, 'click', switchView);
            listen(pauseButton, 'click', togglePause);
            listen(kill, 'click', killSelected);
            listen(panicButton, 'click', recover);
            listen(filter, 'input', renderProcesses);
            listen(tbody, 'click', event => {
                const row = event.target.closest('tr[data-key]');
                if (!row) return;
                selected = row.dataset.key;
                renderProcesses();
                table.focus({ preventScroll: true });
            });
            listen(ctx.body, 'keydown', event => {
                if (event.altKey || event.ctrlKey || event.metaKey || panic) return;
                if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    event.stopPropagation();
                    const list = visibleProcesses();
                    const index = list.findIndex(process => process.key === selected);
                    selected = list[clamp(index + (event.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1)]?.key || null;
                    renderProcesses();
                    tbody.querySelector('tr[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
                } else if ((event.key === 'Delete' || event.key.toLowerCase() === 'k') && !event.repeat) {
                    event.preventDefault();
                    killSelected();
                } else if (event.key === '/') {
                    event.preventDefault();
                    filter.focus();
                } else if (event.key.toLowerCase() === 'v' && !event.repeat) {
                    event.preventDefault();
                    switchView();
                } else if (event.key.toLowerCase() === 'p' && !event.repeat) {
                    event.preventDefault();
                    togglePause();
                }
            });
            ctx.onResize(({ width, height }) => {
                root.style.setProperty('--bt-process-height', clamp(height - 420, 110, 200) + 'px');
                columns = clamp(Math.floor((width - 55) / 7.2), 12, 120);
                root.classList.toggle('bt-narrow', width < 680);
                root.classList.toggle('bt-tiny', width < 390);
                drawGraphs();
            });
            ctx.onFocus(() => { if (!closed) { syncWindows(); renderProcesses(); renderMetrics(); } });
            listen(document, 'visibilitychange', () => { if (!document.hidden && !closed && !ctx.win.hidden && !ctx.win.inert) { syncWindows(); renderMetrics(); renderProcesses(); } });
            ctx.setTitle('btop — lennox-os');
            cpuThreads.forEach((thread, i) => { thread.frequency = i < 12 ? 4.2 : 3.2; });
            syncWindows();
            renderMetrics();
            renderProcesses();
            const interval = setInterval(sample, 1000);
            ctx.onClose(() => {
                closed = true;
                clearInterval(interval);
                abort.abort();
                windows.clear();
            });
        }
    });
})();
