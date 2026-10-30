(() => {
    'use strict';
    const os = window.LennoxOS;
    if (!document.getElementById('app-minesweeper-style')) {
        const style = document.createElement('style');
        style.id = 'app-minesweeper-style';
        style.textContent = `
.lx-mines{display:flex;flex-direction:column;gap:12px;min-height:100%;font:12px monospace;color:var(--text-bright)}
.lx-mines .ms-tools,.lx-mines .ms-dashboard{display:flex;justify-content:space-between;align-items:center;gap:8px}.lx-mines select,.lx-mines .ms-reset{font:inherit;color:var(--text-bright);background:var(--window-bg);border:1px solid var(--window-border);padding:7px;cursor:pointer}.lx-mines .ms-reset{font-size:24px;min-width:46px;padding:2px 8px}.lx-mines .ms-digits{font:32px monospace;font-variant-numeric:tabular-nums;letter-spacing:3px;color:var(--accent);background:var(--desktop-bg);padding:4px 8px;border:1px inset var(--window-border);text-shadow:0 0 7px var(--accent)}
.lx-mines .ms-scroll{overflow:auto;max-width:100%;border:1px solid var(--window-border);padding:6px;background:var(--desktop-bg);align-self:center}.lx-mines .ms-board{display:grid;gap:2px;width:max-content;touch-action:pan-x pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.lx-mines .ms-cell{box-sizing:border-box;width:27px;height:27px;display:grid;place-items:center;padding:0;font:bold 16px monospace;color:var(--text-bright);border:1px solid var(--window-border);border-top-color:var(--text-dim);background:var(--window-bg);cursor:pointer;touch-action:manipulation}.lx-mines .ms-cell:hover{border-color:var(--accent)}.lx-mines .ms-cell:focus-visible{outline:2px solid var(--accent);outline-offset:-3px;z-index:1}.lx-mines .ms-cell.revealed{background:var(--desktop-bg);border-color:color-mix(in srgb,var(--window-border) 40%,transparent);cursor:default}.lx-mines .ms-cell.flag{color:var(--accent)}.lx-mines .ms-cell.exploded{background:var(--accent);color:var(--desktop-bg)}.lx-mines .ms-cell[data-count="1"]{color:#70b7ff}.lx-mines .ms-cell[data-count="2"]{color:#76d99a}.lx-mines .ms-cell[data-count="3"]{color:#ff8c8c}.lx-mines .ms-cell[data-count="4"]{color:#b6a0ff}.lx-mines .ms-cell[data-count="5"]{color:#eeb575}.lx-mines .ms-cell[data-count="6"]{color:#6de0db}.lx-mines .ms-cell[data-count="7"]{color:var(--text-bright)}.lx-mines .ms-cell[data-count="8"]{color:var(--text-dim)}
.lx-mines .ms-status{min-height:16px;color:var(--accent);text-align:center}.lx-mines .ms-help{color:var(--text-dim);font-size:11px;line-height:1.6;text-align:center}.lx-mines .ms-best{color:var(--text-dim)}
`;
        document.head.append(style);
    }
    const levels = { beginner: { w: 9, h: 9, mines: 10 }, intermediate: { w: 16, h: 16, mines: 40 }, expert: { w: 30, h: 16, mines: 99 } };
    os.registerApp({
        id: 'minesweeper', title: 'Minesweeper', desktop: true, startMenu: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 1h2v4l3 1 3-3 2 2-3 3 1 3h4v2h-4l-1 3 3 3-2 2-3-3-3 1v4h-2v-4l-3-1-3 3-2-2 3-3-1-3H1v-2h4l1-3-3-3 2-2 3 3 3-1z"/></svg>',
        defaultSize: { w: 530, h: 620 }, minSize: { w: 320, h: 400 },
        onOpen(ctx) {
            ctx.body.style.padding = '14px';
            const root = document.createElement('div'); root.className = 'lx-mines';
            root.innerHTML = `<div class="ms-tools"><label>Level <select aria-label="Difficulty"><option value="beginner">Beginner · 9×9</option><option value="intermediate">Intermediate · 16×16</option><option value="expert">Expert · 30×16</option></select></label><span class="ms-best"></span></div><div class="ms-dashboard"><output class="ms-digits ms-counter" aria-label="Mines remaining">010</output><button type="button" class="ms-reset" aria-label="Reset game">☺</button><output class="ms-digits ms-timer" aria-label="Elapsed seconds">000</output></div><div class="ms-scroll"><div class="ms-board" role="grid" aria-label="Minesweeper board"></div></div><div class="ms-status" role="status"></div><div class="ms-help">Click reveal · Right-click / hold: ⚑ → ? → clear<br>Click a number to chord · Arrows move · SPACE reveal · F flag<br>First reveal is safe. Expert board scrolls horizontally.</div>`;
            ctx.body.append(root);
            const select = root.querySelector('select'), board = root.querySelector('.ms-board');
            const counter = root.querySelector('.ms-counter'), timer = root.querySelector('.ms-timer');
            const reset = root.querySelector('.ms-reset'), status = root.querySelector('.ms-status'), best = root.querySelector('.ms-best');
            let level = 'beginner', config = levels[level], cells = [], buttons = [], state = 'ready';
            let revealed = 0, flags = 0, cursor = 0, startedAt = 0, seconds = 0, clock = 0, hold = 0, gesture = null, suppressed = null;
            const digits = n => n < 0 ? '-' + String(Math.abs(n)).padStart(2, '0') : String(n).padStart(3, '0');
            function neighbors(index) {
                const x = index % config.w, y = Math.floor(index / config.w), result = [];
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    if (!(dx || dy)) continue;
                    if (x + dx >= 0 && x + dx < config.w && y + dy >= 0 && y + dy < config.h) result.push((y + dy) * config.w + x + dx);
                }
                return result;
            }
            function bestTime() {
                const value = os.settings.get('minesweeper.best.' + level, null);
                return Number.isFinite(value) && value >= 0 ? value : null;
            }
            function updateBest() { const value = bestTime(); best.textContent = value === null ? 'BEST —' : `BEST ${value}s`; }
            function updateClock() { seconds = Math.floor((performance.now() - startedAt) / 1000); timer.textContent = digits(Math.min(999, seconds)); }
            function renderCell(index) {
                const cell = cells[index], button = buttons[index];
                const ended = state === 'lost' || state === 'won';
                const visibleMine = ended && cell.mine;
                button.className = 'ms-cell' + (cell.open ? ' revealed' : '') + (cell.mark === 1 ? ' flag' : '') + (cell.hit ? ' exploded' : '');
                button.dataset.count = cell.open && !cell.mine ? cell.count : '';
                button.textContent = cell.hit ? '✹' : visibleMine ? (cell.mark === 1 ? '⚑' : '✹') : ended && cell.mark === 1 && !cell.mine ? '×' : cell.open ? (cell.count || '') : cell.mark === 1 ? '⚑' : cell.mark === 2 ? '?' : '';
                const description = visibleMine ? 'mine' : cell.open ? (cell.count ? cell.count + ' adjacent mines' : 'empty') : cell.mark === 1 ? 'flagged' : cell.mark === 2 ? 'question mark' : 'covered';
                button.setAttribute('aria-label', `Row ${Math.floor(index / config.w) + 1}, column ${index % config.w + 1}: ${description}`);
            }
            function stopClock() { clearInterval(clock); clock = 0; }
            function finish(won) {
                updateClock(); stopClock(); state = won ? 'won' : 'lost';
                if (won) {
                    cells.forEach(cell => { if (cell.mine) cell.mark = 1; }); flags = config.mines;
                    const record = bestTime();
                    if (record === null || seconds < record) { os.settings.set('minesweeper.best.' + level, seconds); updateBest(); }
                }
                counter.textContent = digits(config.mines - flags); reset.textContent = won ? '😎' : '☹';
                status.textContent = won ? `Field cleared in ${seconds}s!` : 'Mine hit. Reset to try again.';
                ctx.setTitle(`Minesweeper — ${won ? 'Cleared' : 'Game over'}`);
                cells.forEach((_, i) => renderCell(i));
            }
            function plant(first) {
                // A safe opening neighborhood avoids unavoidable first-move guesses.
                const excluded = new Set([first, ...neighbors(first)]);
                const available = cells.map((_, i) => i).filter(i => !excluded.has(i));
                for (let i = available.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [available[i], available[j]] = [available[j], available[i]]; }
                available.slice(0, config.mines).forEach(i => { cells[i].mine = true; });
                cells.forEach((cell, i) => { cell.count = neighbors(i).filter(j => cells[j].mine).length; });
                state = 'playing'; startedAt = performance.now(); clock = setInterval(updateClock, 200);
                status.textContent = 'Clear the field.'; ctx.setTitle('Minesweeper — Playing');
            }
            function reveal(indices) {
                if (state === 'lost' || state === 'won') return;
                const eligible = indices.filter(i => !cells[i].open && cells[i].mark !== 1);
                if (!eligible.length) return;
                if (state === 'ready') plant(eligible[0]);
                const queue = [...eligible], visited = new Set();
                for (let n = 0; n < queue.length; n++) {
                    const i = queue[n], cell = cells[i];
                    if (visited.has(i) || cell.open || cell.mark === 1) continue;
                    visited.add(i);
                    if (cell.mine) { cell.hit = true; finish(false); return; }
                    cell.open = true; cell.mark = 0; revealed++; renderCell(i);
                    if (!cell.count) for (const neighbor of neighbors(i)) if (!visited.has(neighbor)) queue.push(neighbor);
                }
                if (revealed === cells.length - config.mines) finish(true);
            }
            function activate(i) {
                if (cells[i].open) {
                    if (state !== 'playing' || !cells[i].count) return;
                    const near = neighbors(i);
                    if (near.filter(j => cells[j].mark === 1).length === cells[i].count) reveal(near);
                } else reveal([i]);
            }
            function flag(i) {
                if (cells[i].open || state === 'lost' || state === 'won') return;
                const cell = cells[i]; if (cell.mark === 1) flags--;
                cell.mark = (cell.mark + 1) % 3; if (cell.mark === 1) flags++;
                counter.textContent = digits(config.mines - flags); renderCell(i);
            }
            function focusCell(i, focus = true) {
                buttons[cursor]?.setAttribute('tabindex', '-1'); cursor = i;
                buttons[cursor].tabIndex = 0; if (focus) buttons[cursor].focus({ preventScroll: false });
            }
            function cancelHold() { clearTimeout(hold); hold = 0; gesture = null; }
            function newGame() {
                stopClock(); cancelHold(); suppressed = null; level = select.value; config = levels[level];
                state = 'ready'; revealed = 0; flags = 0; seconds = 0; cursor = 0;
                cells = Array.from({ length: config.w * config.h }, () => ({ mine: false, count: 0, open: false, mark: 0, hit: false }));
                board.replaceChildren(); buttons = [];
                board.style.gridTemplateColumns = `repeat(${config.w},27px)`;
                board.setAttribute('aria-rowcount', config.h); board.setAttribute('aria-colcount', config.w);
                const fragment = document.createDocumentFragment();
                cells.forEach((_, i) => {
                    const button = document.createElement('button'); button.type = 'button'; button.dataset.index = i; button.tabIndex = i === 0 ? 0 : -1;
                    button.setAttribute('role', 'gridcell'); button.setAttribute('aria-rowindex', Math.floor(i / config.w) + 1); button.setAttribute('aria-colindex', i % config.w + 1);
                    buttons.push(button); renderCell(i); fragment.append(button);
                });
                board.append(fragment); counter.textContent = digits(config.mines); timer.textContent = '000'; reset.textContent = '☺';
                status.textContent = 'Reveal a cell to start.'; ctx.setTitle('Minesweeper — Ready'); updateBest();
            }
            const indexFrom = event => { const button = event.target.closest('.ms-cell'); return button && board.contains(button) ? Number(button.dataset.index) : null; };
            board.addEventListener('click', event => {
                const i = indexFrom(event); if (i === null) return;
                if (suppressed && suppressed.index === i && performance.now() < suppressed.until) { suppressed = null; event.preventDefault(); return; }
                focusCell(i, false); activate(i);
            });
            board.addEventListener('contextmenu', event => {
                event.preventDefault(); const i = indexFrom(event); if (i === null) return;
                cancelHold();
                if (suppressed && suppressed.index === i && performance.now() < suppressed.until) return;
                focusCell(i); flag(i);
                if (event.pointerType === 'touch') suppressed = { index: i, until: performance.now() + 1500 };
            });
            board.addEventListener('pointerdown', event => {
                const i = indexFrom(event); if (i === null || event.pointerType === 'mouse') return;
                cancelHold(); suppressed = null; gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
                hold = setTimeout(() => { flag(i); focusCell(i, false); suppressed = { index: i, until: performance.now() + 1500 }; hold = 0; }, 500);
            });
            board.addEventListener('pointermove', event => { if (gesture && gesture.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) cancelHold(); });
            board.addEventListener('pointerup', cancelHold); board.addEventListener('pointercancel', cancelHold); board.addEventListener('pointerleave', cancelHold);
            board.addEventListener('focusin', event => { const i = indexFrom(event); if (i !== null) focusCell(i, false); });
            board.addEventListener('keydown', event => {
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                const i = indexFrom(event); if (i === null) return;
                const x = i % config.w, y = Math.floor(i / config.w);
                const moves = { ArrowLeft: [Math.max(0, x - 1), y], ArrowRight: [Math.min(config.w - 1, x + 1), y], ArrowUp: [x, Math.max(0, y - 1)], ArrowDown: [x, Math.min(config.h - 1, y + 1)] };
                if (moves[event.key]) { event.preventDefault(); const [nx, ny] = moves[event.key]; focusCell(ny * config.w + nx); }
                else if (event.key === ' ') { event.preventDefault(); if (!event.repeat) activate(i); }
                else if (event.key.toLowerCase() === 'f') { event.preventDefault(); if (!event.repeat) flag(i); }
            });
            select.addEventListener('change', newGame); reset.addEventListener('click', newGame);
            const settingsChanged = event => { if (event.detail.key === 'minesweeper.best.' + level) updateBest(); };
            os.settings.addEventListener('change', settingsChanged);
            ctx.onClose(() => { stopClock(); cancelHold(); os.settings.removeEventListener('change', settingsChanged); });
            newGame();
        }
    });
})();
