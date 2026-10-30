(() => {
    'use strict';
    const os = window.LennoxOS;
    const style = document.createElement('style');
    style.id = 'app-editor-style';
    style.textContent = `.lx-editor{height:100%;display:flex;flex-direction:column;color:var(--text-bright);background:var(--window-bg);font:13px monospace}.lx-editor button,.lx-editor input{font:inherit;color:inherit;background:var(--window-bg);border:1px solid var(--window-border);padding:5px 8px}.lx-editor button:hover{border-color:var(--accent)}.lx-editor .bar{display:flex;gap:5px;align-items:center;padding:5px;flex-wrap:wrap;border-bottom:1px solid var(--window-border)}.lx-editor .workspace{display:flex;flex:1;min-height:0;overflow:hidden}.lx-editor .numbers{margin:0;padding:12px 8px;min-width:35px;text-align:right;color:var(--text-dim);overflow:hidden;line-height:1.5;user-select:none}.lx-editor textarea{flex:1;min-width:0;resize:none;border:0;outline:0;padding:12px 8px;background:transparent;color:inherit;font:inherit;line-height:1.5;tab-size:4}.lx-editor .preview{flex:1;min-width:0;overflow:auto;padding:12px;border-left:1px solid var(--window-border);white-space:pre-wrap;overflow-wrap:anywhere}.lx-editor .status{padding:5px;color:var(--text-dim);border-top:1px solid var(--window-border)}.lx-editor .dialog{padding:12px;border:1px solid var(--accent);max-height:45%;overflow:auto}.lx-editor .dialog input{width:min(100%,480px);box-sizing:border-box}.lx-editor .listing{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.lx-editor [hidden]{display:none!important}`;
    document.head.append(style);
    function el(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
    os.registerApp({ id: 'editor', title: 'Editor', desktop: true, startMenu: true, multiInstance: true, defaultSize: { w: 780, h: 560 }, minSize: { w: 340, h: 270 },
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2h12l4 4v16H4zm3 8v2h10v-2zm0 5v2h10v-2z"/></svg>',
        onOpen(ctx) {
            ctx.body.style.cssText = 'padding:0;overflow:hidden';
            const root = el('div', undefined, 'lx-editor'), menus = el('div', undefined, 'bar'), findbar = el('div', undefined, 'bar'), dialog = el('div', undefined, 'dialog'), work = el('div', undefined, 'workspace'), numbers = el('pre', '1', 'numbers'), input = el('textarea'), preview = el('div', undefined, 'preview'), status = el('div', undefined, 'status');
            numbers.setAttribute('aria-hidden','true'); input.setAttribute('aria-label', 'Document'); input.spellcheck = false; input.wrap = 'off'; preview.hidden = true; findbar.hidden = true; dialog.hidden = true;
            work.append(numbers, input, preview); root.append(menus, findbar, dialog, work, status); ctx.body.append(root);
            let path = null, saved = '', font = 14, draftTimer, closed = false;
            const button = (host, text, fn) => { const b = el('button', text); b.type = 'button'; b.onclick = fn; host.append(b); return b; };
            const dirty = () => input.value !== saved;
            function draft() { clearTimeout(draftTimer); if (dirty()) os.settings.set('editor.draft', { path, text: input.value, time: Date.now() }); }
            function renderMarkdown() {
                preview.replaceChildren(); let code = null;
                for (const line of input.value.split('\n')) {
                    if (/^\s*```/.test(line)) { if (code) code = null; else { code = el('pre', ''); preview.append(code); } continue; }
                    if (code) { code.append(document.createTextNode(line + '\n')); continue; }
                    const heading = /^(#{1,6})\s+(.*)$/.exec(line), bullet = /^\s*[-*+]\s+(.*)$/.exec(line), quote = /^>\s?(.*)$/.exec(line);
                    const node = el(heading ? 'h' + heading[1].length : quote ? 'blockquote' : 'div');
                    const text = heading ? heading[2] : bullet ? '• ' + bullet[1] : quote ? quote[1] : line || '\u00a0';
                    const tokens = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g; let end = 0;
                    for (const match of text.matchAll(tokens)) { node.append(document.createTextNode(text.slice(end, match.index))); node.append(el(match[2] ? 'strong' : match[3] ? 'code' : 'em', match[2] || match[3] || match[4])); end = match.index + match[0].length; }
                    node.append(document.createTextNode(text.slice(end))); preview.append(node);
                }
            }
            function update() {
                const before = input.value.slice(0, input.selectionStart), lines = input.value.split('\n').length;
                numbers.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
                ctx.setTitle((dirty() ? '• ' : '') + (path ? path.split('/').pop() : 'Untitled') + ' — Editor');
                status.textContent = `Ln ${before.split('\n').length}, Col ${before.length - before.lastIndexOf('\n')} · ${input.value.length} chars · ${path?.split('.').pop() || 'text'} · Draft retained on close`;
                if (!preview.hidden) renderMarkdown();
            }
            function load(file) { const text = file ? os.fs.read(file) : ''; if (text === null) { os.notify({title:'Editor', body:'File could not be opened.'}); return; } path = file ? os.fs.get(file).path : null; input.value = saved = text; update(); input.focus(); }
            function guard(action) {
                if (!dirty()) return action();
                draft(); dialog.hidden = false; dialog.replaceChildren(el('p', 'Unsaved changes. A recovery draft is retained.'));
                button(dialog, 'Save and continue', () => save(false, () => { dialog.hidden = true; action(); }));
                button(dialog, 'Continue without saving', () => { dialog.hidden = true; action(); }); button(dialog, 'Cancel', () => { dialog.hidden = true; input.focus(); });
            }
            function picker(saveMode, done) {
                dialog.hidden = false; dialog.replaceChildren(el('p', saveMode ? 'Save as — absolute file path' : 'Open file — select a folder or enter a path'));
                const field = el('input'); field.setAttribute('aria-label', 'File path'); field.value = saveMode ? path || '/home/lennox/Documents/untitled.txt' : path || '/home/lennox/Documents';
                const listing = el('div', undefined, 'listing'), error = el('p'); dialog.append(field, listing, error);
                function list(folder) { listing.replaceChildren(); const nodes = os.fs.list(folder); if (!nodes) return; button(listing, '..', () => { field.value = folder.slice(0, folder.lastIndexOf('/')) || '/'; list(field.value); }); for (const n of nodes) button(listing, (n.type === 'folder' ? '▸ ' : '') + n.name, () => { field.value = n.path; if (n.type === 'folder') list(n.path); }); }
                list(saveMode ? (field.value.slice(0, field.value.lastIndexOf('/')) || '/') : field.value);
                const accept = () => { if (os.fs.get(field.value)?.type === 'folder') { list(field.value); return; } if (saveMode) {
                    if (field.dataset.overwrite !== field.value && os.fs.exists(field.value)) { field.dataset.overwrite = field.value; error.textContent = 'File exists. Press Save again to overwrite.'; return; }
                    if (!os.fs.write(field.value, input.value)) { error.textContent = 'Save failed: check folder and the 1,000,000 character limit.'; return; }
                    path = os.fs.get(field.value).path; saved = input.value; update(); os.notify({title:'Editor',body:'Saved ' + path});
                } else { if (os.fs.read(field.value) === null) { error.textContent = 'Select an existing file.'; return; } load(field.value); } dialog.hidden = true; if (done) done(); };
                button(dialog, saveMode ? 'Save' : 'Open', accept); button(dialog, 'Cancel', () => { dialog.hidden = true; }); field.onkeydown = e => { if (e.key === 'Enter') accept(); }; field.focus();
            }
            function save(as, done) { clearTimeout(draftTimer); if (as || !path) return picker(true, done); if (!os.fs.write(path, input.value)) return os.notify({title:'Save failed',body:'Check the parent folder and file size.'}); saved = input.value; update(); os.notify({title:'Editor',body:'Saved ' + path}); if (done) done(); }
            const query = el('input'), replacement = el('input'), result = el('span'); query.placeholder = 'Find'; query.setAttribute('aria-label','Find'); replacement.placeholder = 'Replace'; replacement.setAttribute('aria-label','Replace'); findbar.append(query, replacement);
            function find() { if (!query.value) return; let i = input.value.indexOf(query.value, input.selectionEnd); if (i < 0) i = input.value.indexOf(query.value); result.textContent = i < 0 ? 'No match' : ''; if (i >= 0) { input.focus(); input.setSelectionRange(i, i + query.value.length); update(); } }
            button(findbar, 'Next', find); button(findbar, 'Replace', () => { if (query.value && input.value.slice(input.selectionStart,input.selectionEnd) === query.value) { input.setRangeText(replacement.value,input.selectionStart,input.selectionEnd,'end'); input.dispatchEvent(new Event('input')); } find(); });
            button(findbar, 'Replace all', () => { if (!query.value) return; input.value = input.value.split(query.value).join(replacement.value); update(); draft(); }); button(findbar,'×', () => { findbar.hidden = true; input.focus(); }); findbar.append(result);
            function showFind(replace) { findbar.hidden = false; replacement.hidden = !replace; query.focus(); query.select(); }
            function menu(label, items) { const b = button(menus,label, () => { const r = b.getBoundingClientRect(); os.contextMenu(r.left,r.bottom,items.map(([label,action]) => ({label,action}))); }); }
            menu('File', [['New', () => guard(() => load(null))], ['Open…', () => guard(() => picker(false))], ['Save', () => save(false)], ['Save As…', () => save(true)], ['Close', () => guard(() => ctx.close())]]);
            menu('Edit', [['Undo', () => { input.focus(); document.execCommand('undo'); }], ['Redo', () => { input.focus(); document.execCommand('redo'); }], ['Find', () => showFind(false)], ['Replace', () => showFind(true)]]);
            menu('View', [['Toggle word wrap', () => { input.wrap = input.wrap === 'off' ? 'soft' : 'off'; numbers.hidden = input.wrap === 'soft'; }], ['Increase font size', () => { font = Math.min(28,font+1); work.style.fontSize = font+'px'; }], ['Decrease font size', () => { font = Math.max(10,font-1); work.style.fontSize = font+'px'; }], ['Markdown preview', () => { if (!path || /\.md$/i.test(path)) { preview.hidden = !preview.hidden; update(); } else os.notify({title:'Editor',body:'Markdown preview is available for .md files.'}); }]]);
            const recovery = os.settings.get('editor.draft'); if (recovery && typeof recovery.text === 'string') button(menus,'Recover draft', () => guard(() => { path = typeof recovery.path === 'string' ? recovery.path : null; saved = path ? os.fs.read(path) ?? '' : ''; input.value = recovery.text; update(); }));
            input.addEventListener('input', () => { update(); clearTimeout(draftTimer); draftTimer = setTimeout(draft,400); }); input.addEventListener('scroll', () => { numbers.scrollTop = input.scrollTop; }); for (const type of ['click','keyup','select']) input.addEventListener(type,update);
            root.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey)) return; const k=e.key.toLowerCase(); if (['s','n','f','h'].includes(k)) { e.preventDefault(); if (k==='s') save(e.shiftKey); if (k==='n') guard(() => load(null)); if (k==='f'||k==='h') showFind(k==='h'); } });
            load(ctx.args?.path || null); ctx.onFocus(() => { if (!closed && dialog.hidden && findbar.hidden) input.focus(); }); ctx.onClose(() => { draft(); closed = true; clearTimeout(draftTimer); });
        }
    });
    for (const ext of ['txt','md','json','js','css','html','log','conf','sh','*']) os.registerFileHandler(ext,'editor');
})();
