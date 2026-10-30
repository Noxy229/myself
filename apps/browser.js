(() => {
    'use strict';
    const os = window.LennoxOS;
    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function button(text, action, label) {
        const node = el('button', text); node.type = 'button';
        if (label) { node.setAttribute('aria-label', label); node.title = label; }
        node.addEventListener('click', action); return node;
    }
    const pages = [['Home', 'lennox://home'], ['Projects', 'lennox://projects'], ['About', 'lennox://about'], ['Nexus', 'nexus']];
    const projects = [
        ['ASTRA', 'Self-hosted AI chat client with a Gemini-style UI.', 'Next.js 15 · Tailwind · SQLite · Multi-provider'],
        ['BERICHTSHEFT', 'IHK-compliant automated logging for apprentices in Niedersachsen.', 'Apprenticeship · Automation · Documentation'],
        ['SCROLLCRAFT', 'Claude Code skill for premium scroll-driven websites.', 'Design · Motion · Web experiences']
    ];
    if (!document.getElementById('app-browser-style')) {
        const style = el('style'); style.id = 'app-browser-style';
        style.textContent = `
.lx-browser{height:100%;display:flex;flex-direction:column;min-height:0;background:var(--window-bg);color:var(--text-bright);font:14px/1.5 system-ui,sans-serif}
.lx-browser *{box-sizing:border-box}.lx-browser button,.lx-browser input{font:inherit;color:inherit}.lx-browser button{border:1px solid var(--window-border);background:var(--desktop-bg);border-radius:6px;padding:7px 11px;cursor:pointer}
.lx-browser button:hover,.lx-browser button:focus-visible{border-color:var(--accent)}.lx-browser button:disabled{opacity:.35;cursor:default}.lx-browser input{min-width:0;border:1px solid var(--window-border);background:var(--window-bg);border-radius:7px;padding:9px 12px;outline:none}.lx-browser input:focus{border-color:var(--accent)}
.lx-browser .lx-browser-tabs{display:flex;gap:5px;padding:8px 10px 0;background:var(--desktop-bg);flex-shrink:0}.lx-browser .lx-tab-list{display:flex;gap:5px;overflow:auto;flex:1}.lx-browser .lx-tab{display:flex;flex:0 0 175px;min-width:0;border:1px solid var(--window-border);border-radius:8px 8px 0 0;align-items:center}.lx-browser .lx-tab.active{border-color:var(--accent);background:var(--window-bg)}
.lx-browser .lx-tab button{border:0;background:transparent;padding:7px}.lx-browser .lx-tab button:first-child{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}.lx-browser .lx-tab button:last-child{flex-shrink:0}
.lx-browser .lx-browser-toolbar{display:flex;gap:5px;padding:8px 10px;align-items:center;border-bottom:1px solid var(--window-border)}.lx-browser .lx-address{display:flex;flex:1;min-width:0;gap:5px}.lx-browser .lx-address input{width:100%}
.lx-browser .lx-bookmarks{display:flex;gap:6px;flex-wrap:wrap;padding:6px 10px;border-bottom:1px solid var(--window-border)}.lx-browser .lx-bookmarks button{padding:3px 10px;font-size:12px;border-color:transparent}
.lx-browser .lx-browser-view{flex:1;min-height:0;overflow:auto}.lx-browser .lx-browser-page{max-width:850px;margin:auto;padding:36px}.lx-browser .lx-eyebrow{letter-spacing:3px;font-size:11px;color:var(--accent);font-weight:700}.lx-browser h1{font-size:34px;line-height:1.15;margin:14px 0}.lx-browser p{color:var(--text-dim);overflow-wrap:anywhere}.lx-browser .lx-hero{padding:18px 0 24px}.lx-browser .lx-search{display:flex;gap:8px;margin:24px 0}.lx-browser .lx-search input{flex:1;width:100%}
.lx-browser .lx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px}.lx-browser .lx-tile{text-align:left;padding:20px;min-height:95px}.lx-browser .lx-tile strong{display:block;font-size:18px;margin-bottom:5px}.lx-browser .lx-tile span{color:var(--text-dim);font-size:12px}
.lx-browser .lx-project{padding:22px;border:1px solid var(--window-border);border-radius:10px;margin:14px 0}.lx-browser .lx-project h2{font-size:18px;margin:0}.lx-browser .lx-project small{color:var(--accent)}.lx-browser .lx-blocked{border-left:3px solid var(--accent);padding-left:22px}.lx-browser .lx-result{display:block;margin:16px 0;text-align:left;width:100%;padding:16px}.lx-browser .lx-result span{display:block;font-size:12px;color:var(--text-dim)}
.lx-browser iframe{width:100%;height:100%;border:0;display:block;background:var(--desktop-bg)}.lx-browser .lx-status{padding:3px 12px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--window-border);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
@media(max-width:520px){.lx-browser .lx-browser-page{padding:22px 16px}.lx-browser h1{font-size:27px}.lx-browser .lx-browser-toolbar{gap:3px;padding:6px}.lx-browser .lx-browser-toolbar button{padding:6px}.lx-browser .lx-search{flex-wrap:wrap}.lx-browser .lx-tab{flex-basis:145px}}`;
        document.head.append(style);
    }
    os.registerApp({
        id: 'browser', title: 'Browser', desktop: true, startMenu: true, multiInstance: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c-6 6-6 12 0 18 6-6 6-12 0-18Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        defaultSize: { w: 960, h: 640 }, minSize: { w: 360, h: 300 },
        onOpen(ctx) {
            ctx.body.style.padding = '0'; ctx.body.style.overflow = 'hidden';
            const root = el('div', undefined, 'lx-browser'); const tabsBar = el('div', undefined, 'lx-browser-tabs');
            const tabsList = el('div', undefined, 'lx-tab-list'); tabsList.setAttribute('role', 'tablist'); tabsList.setAttribute('aria-label', 'Browser tabs');
            tabsBar.append(tabsList, button('+', () => newTab('lennox://home'), 'New tab'));
            const toolbar = el('div', undefined, 'lx-browser-toolbar');
            const back = button('←', () => travel(-1), 'Back'); const forward = button('→', () => travel(1), 'Forward');
            const reload = button('↻', () => render(), 'Reload'); const home = button('⌂', () => navigate('lennox://home'), 'Home');
            const addressForm = el('form', undefined, 'lx-address'); const address = el('input'); address.type = 'text'; address.setAttribute('aria-label', 'Address or search'); address.autocomplete = 'off'; address.spellcheck = false;
            const go = el('button', 'Go'); go.type = 'submit'; addressForm.append(address, go); addressForm.addEventListener('submit', event => { event.preventDefault(); navigate(address.value); });
            toolbar.append(back, forward, reload, home, addressForm);
            const bookmarks = el('nav', undefined, 'lx-bookmarks'); bookmarks.setAttribute('aria-label', 'Bookmarks');
            for (const [title, url] of pages) bookmarks.append(button(title, () => navigate(url)));
            const view = el('div', undefined, 'lx-browser-view'); view.setAttribute('role', 'tabpanel');
            const status = el('div', '', 'lx-status'); status.setAttribute('role', 'status');
            root.append(tabsBar, toolbar, bookmarks, view, status); ctx.body.append(root);
            const tabs = []; let active = null; let serial = 0;
            function normalize(input) {
                const value = typeof input === 'string' ? input.trim() : '';
                if (!value) return 'lennox://home';
                if (/^(nexus|(?:\.\/)?nexus\.html|lennox:\/\/nexus)\/?$/i.test(value)) return 'nexus';
                if (/^lennox:\/\//i.test(value)) return 'lennox://' + value.slice(9);
                if (/^https?:\/\//i.test(value)) {
                    try { return new URL(value).href; } catch (_) { return 'lennox://search?q=' + encodeURIComponent(value); }
                }
                if (/^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(?:[/?#]|$)/i.test(value)) {
                    try { return new URL('https://' + value).href; } catch (_) { /* Render as a search. */ }
                }
                return 'lennox://search?q=' + encodeURIComponent(value);
            }
            function currentURL() { return active.history[active.index]; }
            function titleFor(url) {
                if (url === 'nexus') return 'Nexus';
                for (const [title, path] of pages) if (path === url) return title;
                if (url.startsWith('lennox://search?')) return 'Search';
                if (url.startsWith('lennox://')) return 'Page not found';
                try { return new URL(url).hostname; } catch (_) { return 'Browser'; }
            }
            function renderTabs() {
                tabsList.replaceChildren();
                for (const tab of tabs) {
                    const row = el('div', undefined, 'lx-tab' + (tab === active ? ' active' : ''));
                    const title = titleFor(tab.history[tab.index]);
                    const select = button(title, () => { active = tab; render(); }); select.setAttribute('role', 'tab'); select.setAttribute('aria-selected', String(tab === active)); select.id = ctx.win.id + '-tab-' + tab.id;
                    select.addEventListener('keydown', event => {
                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                        event.preventDefault();
                        const index = tabs.indexOf(tab); const offset = event.key === 'ArrowLeft' ? -1 : 1;
                        active = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length];
                        render(); document.getElementById(ctx.win.id + '-tab-' + active.id)?.focus();
                    });
                    row.append(select, button('×', () => closeTab(tab), 'Close ' + title + ' tab')); tabsList.append(row);
                }
            }
            function newTab(url) {
                active = { id: ++serial, history: [normalize(url)], index: 0 }; tabs.push(active); render();
            }
            function closeTab(tab) {
                const index = tabs.indexOf(tab); if (index < 0) return;
                tabs.splice(index, 1);
                if (!tabs.length) { newTab('lennox://home'); return; }
                if (active === tab) active = tabs[Math.min(index, tabs.length - 1)];
                render();
            }
            function navigate(input) {
                const url = normalize(input);
                if (currentURL() !== url) { active.history.splice(active.index + 1); active.history.push(url); active.index++; }
                render();
            }
            function travel(offset) {
                const next = active.index + offset;
                if (next >= 0 && next < active.history.length) { active.index = next; render(); }
            }
            function searchBox(parent) {
                const form = el('form', undefined, 'lx-search'); const input = el('input'); input.placeholder = 'Search this workspace or enter an address'; input.setAttribute('aria-label', 'Search workspace');
                const submit = el('button', 'Search'); submit.type = 'submit'; form.append(input, submit);
                form.addEventListener('submit', event => { event.preventDefault(); navigate(input.value); }); parent.append(form);
            }
            function render() {
                const url = currentURL(); const title = titleFor(url); renderTabs(); address.value = url;
                view.setAttribute('aria-labelledby', ctx.win.id + '-tab-' + active.id);
                back.disabled = active.index === 0; forward.disabled = active.index === active.history.length - 1;
                ctx.setTitle(title + ' — Browser'); view.replaceChildren(); view.scrollTop = 0;
                status.textContent = url === 'nexus' ? 'Local page · sandboxed' : url.startsWith('lennox://') ? 'Lennox_OS internal page' : 'External connection blocked';
                if (url === 'nexus') {
                    const frame = el('iframe'); frame.title = 'Nexus'; frame.setAttribute('sandbox', 'allow-scripts'); frame.src = './nexus.html'; view.append(frame); return;
                }
                const page = el('article', undefined, 'lx-browser-page'); view.append(page);
                page.append(el('div', 'LENNOX / NETWORK', 'lx-eyebrow'));
                if (url === 'lennox://home') {
                    const hero = el('div', undefined, 'lx-hero'); hero.append(el('h1', 'Your next rabbit hole.'), el('p', 'A small window into systems, code, and everything Lennox builds.')); page.append(hero); searchBox(page);
                    const tiles = el('div', undefined, 'lx-tiles');
                    for (const [name, path] of pages.slice(1)) { const tile = button('', () => navigate(path)); tile.className = 'lx-tile'; tile.append(el('strong', name), el('span', path)); tiles.append(tile); }
                    page.append(tiles);
                } else if (url === 'lennox://projects') {
                    page.append(el('h1', 'Built to do something.'), el('p', 'Selected projects from Lennox’s workspace.'));
                    for (const [name, description, stack] of projects) { const card = el('section', undefined, 'lx-project'); card.append(el('h2', name), el('p', description), el('small', stack)); page.append(card); }
                } else if (url === 'lennox://about') {
                    page.append(el('h1', 'Hello, I’m Lennox.'), el('p', 'Fachinformatiker Systemintegration apprentice in Niedersachsen. Building self-hosted infrastructure, AI tools, and thoughtful web experiences.'));
                    const card = el('section', undefined, 'lx-project'); card.append(el('h2', 'Behind the desktop'), el('p', 'Intel i5-13600KF · AMD Radeon RX 9070 XT · Hyte Y60 · 3× LG displays'));
                    page.append(card, button('Explore projects', () => navigate('lennox://projects')), document.createTextNode(' '), button('Enter Nexus', () => navigate('nexus')));
                } else if (url.startsWith('lennox://search?')) {
                    const query = new URLSearchParams(url.slice(url.indexOf('?'))).get('q') || '';
                    page.append(el('h1', 'Workspace search'), el('p', 'Local results for “' + query + '”. No search request leaves this desktop.')); searchBox(page);
                    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
                    const entries = [['Projects', 'lennox://projects', projects.flat().join(' ')], ['About Lennox', 'lennox://about', 'Lennox Niedersachsen apprentice systems hardware Intel AMD'], ['Nexus', 'nexus', 'Nexus experimental visual experience'], ['Home', 'lennox://home', 'Home start workspace']];
                    const matches = entries.filter(entry => terms.some(term => entry.join(' ').toLowerCase().includes(term)));
                    page.append(el('p', matches.length ? matches.length + ' matching pages' : 'No exact match. Explore these local pages.'));
                    for (const [name, path] of matches.length ? matches : entries) { const result = button('', () => navigate(path)); result.className = 'lx-result'; result.append(el('strong', name), el('span', path)); page.append(result); }
                } else if (url.startsWith('lennox://')) {
                    page.append(el('h1', '404 · Wrong wormhole.'), el('p', 'This address wandered outside the workspace: ' + url), button('Return home', () => navigate('lennox://home')));
                } else {
                    const blocked = el('section', undefined, 'lx-blocked');
                    blocked.append(el('h1', 'Connection blocked by Lennox_OS firewall'), el('p', 'External sites open in your real browser, where sign-ins and security controls work normally.'), el('p', url), button('Open in a real new tab', () => window.open(url, '_blank', 'noopener,noreferrer')));
                    page.append(blocked);
                }
            }
            ctx.onClose(() => { view.querySelectorAll('iframe').forEach(frame => { frame.src = 'about:blank'; frame.remove(); }); tabs.length = 0; });
            newTab(ctx.args?.url || 'lennox://home');
        }
    });
})();
