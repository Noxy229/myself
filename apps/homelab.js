(() => {
    'use strict';
    const os = window.LennoxOS;
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
    os.registerApp({
        id: 'homelab', title: 'Homelab', desktop: true, startMenu: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2h18v6H3zm2 2v2h2V4zM3 9h18v6H3zm2 2v2h2v-2zM3 16h18v6H3zm2 2v2h2v-2z"/></svg>',
        defaultSize: { w: 1000, h: 640 }, minSize: { w: 600, h: 430 },
        onOpen(ctx) {
            if (!document.getElementById('app-homelab-style')) {
                const style = el('style'); style.id = 'app-homelab-style';
                style.textContent = `.lx-lab{height:100%;display:flex;flex-direction:column;background:var(--window-bg);color:var(--text-bright);font:12px ui-monospace,monospace;overflow:hidden}.lx-lab *{box-sizing:border-box}.lx-lab button{font:inherit;color:inherit;background:var(--desktop-bg);border:1px solid var(--window-border);padding:7px 10px;border-radius:3px;cursor:pointer}.lx-lab button:hover,.lx-lab button[aria-selected=true],.lx-lab button[aria-current=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--window-bg))}.lx-lab button:disabled{opacity:.4;cursor:default}.lx-lab :focus-visible{outline:2px solid var(--accent);outline-offset:1px}.lx-lab .lab-header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--window-border);gap:10px}.lx-lab .lab-brand{font-size:16px;font-weight:700;letter-spacing:-.5px}.lx-lab small,.lx-lab .muted{color:var(--text-dim)}.lx-lab .lab-layout{display:flex;flex:1;min-height:0}.lx-lab .lab-tree{width:195px;flex-shrink:0;padding:12px 7px;border-right:1px solid var(--window-border);overflow:auto}.lx-lab .lab-tree button{display:block;width:100%;text-align:left;border-color:transparent;margin:2px 0;padding:7px 4px}.lx-lab .lab-tree .guest{padding-left:20px;font-size:11px}.lx-lab .lab-workspace{flex:1;min-width:0;display:flex;flex-direction:column}.lx-lab .lab-toolbar{display:flex;gap:5px;padding:8px 12px;border-bottom:1px solid var(--window-border);flex-wrap:wrap}.lx-lab .lab-view{padding:16px;overflow:auto;flex:1;min-height:0}.lx-lab h2{margin:0 0 5px;font-size:20px}.lx-lab h3{font-size:12px;margin:0 0 10px}.lx-lab .lab-tabs{display:flex;gap:5px;margin:15px 0}.lx-lab .lab-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}.lx-lab .lab-card{border:1px solid var(--window-border);padding:12px;background:var(--desktop-bg);border-radius:5px;overflow:hidden}.lx-lab .lab-value{font-size:22px;margin:8px 0;color:var(--text-bright)}.lx-lab .lab-graphs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lx-lab svg{display:block;width:100%;height:100px}.lx-lab .lab-chart-line{stroke:var(--accent);stroke-width:2;fill:none;stroke-linejoin:round}.lx-lab .lab-chart-area{fill:var(--accent);opacity:.10}.lx-lab .lab-grid{stroke:var(--window-border);stroke-width:.6}.lx-lab .lab-tasks{height:145px;flex-shrink:0;overflow:auto;border-top:1px solid var(--window-border);background:var(--desktop-bg)}.lx-lab .lab-task-title{position:sticky;top:0;padding:8px 12px;background:var(--window-bg);border-bottom:1px solid var(--window-border)}.lx-lab table{border-collapse:collapse;width:100%;font-size:11px}.lx-lab th,.lx-lab td{padding:9px 10px;text-align:left;border-bottom:1px solid var(--window-border);white-space:nowrap}.lx-lab th{color:var(--text-dim);font-weight:normal}.lx-lab .lab-table-scroll{overflow:auto}.lx-lab .lab-console{background:#050709;color:#c3d1c4;min-height:240px;padding:16px;white-space:pre-wrap;line-height:1.7;overflow-wrap:anywhere}.lx-lab .lab-console-header{display:flex;justify-content:space-between;padding:9px;border:1px solid var(--window-border)}.lx-lab dl{display:grid;grid-template-columns:130px 1fr;gap:10px}.lx-lab dd{margin:0}.lx-lab dt{color:var(--text-dim)}.lx-lab .lab-note{margin-top:16px;color:var(--text-dim);line-height:1.6}@media(max-width:650px){.lx-lab .lab-tree{width:145px}.lx-lab .lab-cards,.lx-lab .lab-graphs{grid-template-columns:1fr}.lx-lab .lab-header small{display:none}.lx-lab .lab-view{padding:10px}.lx-lab .lab-tasks{height:115px}}`;
                document.head.append(style);
            }
            ctx.body.style.padding = '0';
            const root = el('div', undefined, 'lx-lab'); ctx.body.append(root);
            const header = el('header', undefined, 'lab-header'); header.append(el('div', 'Proxmox VE / Lennox', 'lab-brand'), el('small', 'SIMULATED HOMELAB · root@pam')); root.append(header);
            const layout = el('div', undefined, 'lab-layout'), tree = el('nav', undefined, 'lab-tree'), workspace = el('div', undefined, 'lab-workspace'), toolbar = el('div', undefined, 'lab-toolbar'), view = el('main', undefined, 'lab-view'); tree.setAttribute('aria-label', 'Homelab resources'); workspace.append(toolbar, view); layout.append(tree, workspace); root.append(layout);
            const taskPanel = el('section', undefined, 'lab-tasks'), taskTitle = el('div', 'Tasks · local simulation', 'lab-task-title'), taskTable = el('table'), taskBody = el('tbody'); taskPanel.setAttribute('aria-label', 'Task log'); const taskHead = el('thead'), taskHeadRow = el('tr'); ['Time', 'User', 'Description', 'Status'].forEach(x => taskHeadRow.append(el('th', x))); taskHead.append(taskHeadRow); taskTable.append(taskHead, taskBody); taskPanel.append(taskTitle, taskTable); root.append(taskPanel);
            const guests = [
                [100, 'opnsense', 'VM', 2, 2, 16, 'Firewall / routing'], [101, 'docker-host', 'VM', 4, 8, 120, 'Debian 12 / Docker'], [102, 'home-assistant', 'VM', 2, 4, 32, 'Home Assistant OS'], [103, 'ai-lab', 'VM', 8, 16, 200, 'Ubuntu / Ollama'], [104, 'nextcloud', 'LXC', 2, 2, 80, 'Private cloud'], [105, 'pihole', 'LXC', 1, 0.5, 8, 'DNS filtering'], [106, 'jellyfin', 'LXC', 4, 4, 64, 'Media server'], [107, 'minecraft', 'VM', 4, 6, 40, 'Paper server']
            ].map(([id, name, type, cores, ram, disk, description]) => ({ id, name, type, cores, ram, disk, description, status: id === 107 ? 'stopped' : 'running', busy: false }));
            const containers = [['portainer', '9443:9443'], ['traefik', '80:80, 443:443'], ['astra', '3000:3000'], ['vaultwarden', '8080:80'], ['grafana', '3001:3000'], ['prometheus', '9090:9090'], ['uptime-kuma', '3002:3001']].map(([name, ports]) => ({ name, ports, busy: false }));
            let selected = null, tab = 'Summary', alive = true, interval = null;
            const timeouts = new Set(), tasks = [], charts = [];
            const metrics = { cpu: 19, ram: 59, network: 2.4 }, samples = Object.fromEntries(Object.keys(metrics).map(key => [key, Array.from({ length: 50 }, () => metrics[key])]));
            function button(label, action, parent, disabled = false) { const b = el('button', label); b.type = 'button'; b.disabled = disabled; b.addEventListener('click', action); parent.append(b); return b; }
            function later(fn, delay) { const timer = setTimeout(() => { timeouts.delete(timer); if (alive) fn(); }, delay); timeouts.add(timer); }
            function renderTasks() {
                taskBody.replaceChildren();
                for (const task of tasks) { const row = el('tr'); [task.time, 'root@pam', task.description, task.status].forEach(x => row.append(el('td', x))); taskBody.append(row); }
            }
            function log(description, status = 'OK') { const task = { time: new Date().toLocaleTimeString([], { hour12: false }), description, status }; tasks.unshift(task); tasks.splice(40); renderTasks(); return task; }
            function renderTree() {
                tree.replaceChildren();
                const dc = button('▾ Datacenter', () => { selected = null; tab = 'Summary'; render(); }, tree); dc.setAttribute('aria-current', String(!selected));
                button('  ▾ pve-lennox', () => { selected = null; tab = 'Summary'; render(); }, tree);
                for (const guest of guests) { const b = button((guest.status === 'running' ? '● ' : '○ ') + guest.id + ' ' + guest.name, () => { selected = guest; tab = 'Summary'; render(); }, tree); b.className = 'guest'; b.title = guest.type + ' · ' + guest.status; b.setAttribute('aria-current', String(selected === guest)); }
            }
            function operate(guest, action) {
                if (guest.busy) return;
                guest.busy = true; const task = log(guest.type + ' ' + guest.id + ' · ' + action, 'running…'); render();
                later(() => {
                    guest.status = action === 'Stop' ? 'stopped' : 'running'; guest.busy = false; task.status = 'OK'; renderTasks(); render();
                }, action === 'Restart' ? 2300 : action === 'Start' ? 1700 : 1100);
            }
            function addChart(title, key, max) {
                const card = el('section', undefined, 'lab-card'), label = el('h3', title), value = el('div', '', 'muted');
                const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 400 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', title + ' over the last 50 seconds');
                for (const y of [20, 40, 60, 80]) { const line = document.createElementNS(ns, 'line'); for (const [k, v] of Object.entries({ x1: 0, x2: 400, y1: y, y2: y, class: 'lab-grid' })) line.setAttribute(k, v); svg.append(line); }
                const area = document.createElementNS(ns, 'path'), line = document.createElementNS(ns, 'path'); area.setAttribute('class', 'lab-chart-area'); line.setAttribute('class', 'lab-chart-line'); svg.append(area, line); card.append(label, value, svg); charts.push({ key, max, line, area, value }); return card;
            }
            function draw() {
                for (const chart of charts) {
                    const points = samples[chart.key].map((n, i) => (i ? 'L' : 'M') + (i * 400 / 49).toFixed(1) + ',' + (95 - n / chart.max * 85).toFixed(1)).join(' ');
                    chart.line.setAttribute('d', points); chart.area.setAttribute('d', points + ' L400,100 L0,100 Z'); chart.value.textContent = metrics[chart.key].toFixed(1) + (chart.key === 'network' ? ' MB/s' : '%');
                }
                const cpu = view.querySelector('[data-metric="cpu"]'), ram = view.querySelector('[data-metric="ram"]'); if (cpu) cpu.textContent = metrics.cpu.toFixed(1) + '%'; if (ram) ram.textContent = (metrics.ram * 0.64).toFixed(1) + ' / 64 GiB';
            }
            function summary() {
                if (selected) {
                    const dl = el('dl'); const rows = [['Status', selected.busy ? 'Task in progress…' : selected.status], ['Type', selected.type === 'VM' ? 'QEMU virtual machine' : 'Linux container'], ['CPU', selected.cores + ' vCPU'], ['Memory', selected.ram + ' GiB'], ['Disk', selected.disk + ' GiB · local-lvm'], ['Network', 'vmbr0 · 192.168.10.' + (selected.id - 90)], ['Workload', selected.description]];
                    rows.forEach(([a, b]) => dl.append(el('dt', a), el('dd', b))); view.append(dl, el('p', 'Guest actions and console output are simulated. No connection to Lennox’s real infrastructure.', 'lab-note')); return;
                }
                const cards = el('div', undefined, 'lab-cards');
                for (const [title, text, metric] of [['CPU usage', '', 'cpu'], ['Memory', '', 'ram'], ['Guests online', guests.filter(g => g.status === 'running').length + ' / ' + guests.length, null]]) { const card = el('section', undefined, 'lab-card'), value = el('div', text, 'lab-value'); if (metric) value.dataset.metric = metric; card.append(el('h3', title), value); cards.append(card); }
                view.append(cards);
                const graphs = el('div', undefined, 'lab-graphs'); graphs.append(addChart('CPU · 16 threads', 'cpu', 100), addChart('Memory · 64 GiB', 'ram', 100), addChart('Network · vmbr0', 'network', 10));
                const info = el('section', undefined, 'lab-card'); info.append(el('h3', 'pve-lennox'), el('p', 'Proxmox VE 8.3 · Linux 6.8'), el('p', 'Storage: local-lvm · 1.2 / 2 TB'), el('p', 'Uptime: 12 days, 08:42'), el('p', 'Homelab · Niedersachsen', 'muted')); graphs.append(info); view.append(graphs);
                view.append(el('p', 'A simulated look inside Lennox’s lab: a Fachinformatiker Systemintegration apprentice building with Linux, Docker and local AI.', 'lab-note')); draw();
            }
            function docker() {
                const host = guests.find(g => g.id === 101); view.append(el('p', 'docker-host · Debian 12 · Docker Engine 27', 'muted'));
                const scroll = el('div', undefined, 'lab-table-scroll'), table = el('table'), head = el('thead'), row = el('tr'), body = el('tbody'); ['Container', 'State', 'Published ports', 'Action'].forEach(x => row.append(el('th', x))); head.append(row);
                for (const container of containers) {
                    const r = el('tr'); r.append(el('td', container.name), el('td', host.status !== 'running' ? 'host offline' : container.busy ? 'restarting…' : 'running'), el('td', container.ports)); const action = el('td');
                    button('Restart', () => { if (container.busy || host.busy || host.status !== 'running') return; container.busy = true; const task = log('Docker · restart ' + container.name, 'running…'); render(); later(() => { container.busy = false; task.status = 'OK'; renderTasks(); render(); }, 1400); }, action, container.busy || host.busy || host.status !== 'running'); r.append(action); body.append(r);
                }
                table.append(head, body); scroll.append(table); view.append(scroll);
            }
            function consoleView() {
                const bar = el('div', undefined, 'lab-console-header'); bar.append(el('span', 'noVNC · ' + selected.name), el('span', 'SIMULATION · read only', 'muted')); const screen = el('pre', undefined, 'lab-console'); screen.tabIndex = 0; screen.setAttribute('aria-label', 'Simulated guest console');
                screen.textContent = selected.busy ? 'Connecting to guest…\nPower task is in progress.\nWaiting for guest agent…' : selected.status !== 'running' ? 'Guest is not running.\nStart the guest to connect to its console.' : '[    0.000000] Linux virtual guest · ' + selected.name + '\n[    1.103842] virtio_net: link is up\n[    2.412001] systemd: Reached target Multi-User System.\n[  OK  ] Started OpenSSH server.\n[  OK  ] Started ' + selected.description + '.\n\n' + selected.name + ' tty1\n\n' + selected.name + ' login: ▌\n\n(Local demonstration — no credentials required.)';
                view.append(bar, screen);
            }
            function render() {
                if (!alive) return; renderTree(); toolbar.replaceChildren(); view.replaceChildren(); charts.length = 0;
                toolbar.append(el('span', selected ? selected.type + ' ' + selected.id : 'Node pve-lennox', 'muted'));
                if (selected) { for (const action of ['Start', 'Stop', 'Restart']) button(action, () => operate(selected, action), toolbar, selected.busy || (action === 'Start' ? selected.status === 'running' : selected.status !== 'running')); button('Console', () => { tab = 'Console'; render(); }, toolbar); }
                view.append(el('h2', selected ? selected.name : 'pve-lennox'), el('span', selected ? selected.busy ? '● task in progress' : '● ' + selected.status : '● online · standalone node', 'muted'));
                const tabs = el('div', undefined, 'lab-tabs'); for (const name of selected ? ['Summary', ...(selected.id === 101 ? ['Docker'] : []), 'Console'] : ['Summary', 'Docker']) { const b = button(name, () => { tab = name; render(); }, tabs); b.setAttribute('aria-selected', String(tab === name)); b.setAttribute('role', 'tab'); } tabs.setAttribute('role', 'tablist'); view.append(tabs);
                if (tab === 'Docker') docker(); else if (tab === 'Console' && selected) consoleView(); else summary();
            }
            function tick() {
                if (!alive || document.hidden) return;
                for (const key of Object.keys(metrics)) { const target = key === 'cpu' ? 18 + (guests[3].status === 'running' ? 8 : 0) : key === 'ram' ? 15 + guests.filter(g => g.status === 'running').reduce((sum, g) => sum + g.ram, 0) * 1.05 : 2.5; const scale = key === 'network' ? 0.5 : 2; metrics[key] = Math.max(0.1, Math.min(key === 'network' ? 9 : 96, metrics[key] + (target - metrics[key]) * .12 + (Math.random() - .5) * scale)); samples[key].push(metrics[key]); samples[key].shift(); }
                draw();
            }
            function visibility() { if (interval !== null) { clearInterval(interval); interval = null; } if (alive && !document.hidden) interval = setInterval(tick, 1000); }
            log('Node pve-lennox · session opened'); render(); visibility(); document.addEventListener('visibilitychange', visibility);
            ctx.onClose(() => { alive = false; if (interval !== null) clearInterval(interval); timeouts.forEach(clearTimeout); timeouts.clear(); document.removeEventListener('visibilitychange', visibility); });
        }
    });
})();
