(() => {
    'use strict';
    const os = window.LennoxOS;
    if (!document.getElementById('app-snake-style')) {
        const style = document.createElement('style');
        style.id = 'app-snake-style';
        style.textContent = `
.lx-snake{height:100%;min-height:240px;display:flex;flex-direction:column;gap:12px;color:var(--text-bright);font:13px monospace}
.lx-snake .sn-header{display:flex;justify-content:space-between;gap:10px;align-items:center}.lx-snake .sn-stats{display:flex;gap:18px}.lx-snake strong{color:var(--accent)}
.lx-snake button{background:var(--window-bg);color:var(--text-bright);border:1px solid var(--window-border);padding:8px 12px;font:inherit;cursor:pointer}.lx-snake button:hover,.lx-snake button:focus-visible{border-color:var(--accent);outline:1px solid var(--accent)}
.lx-snake .sn-arena{flex:1;min-height:100px;position:relative;display:grid;place-items:center;overflow:hidden;border:1px solid var(--window-border);background:var(--desktop-bg)}
.lx-snake canvas{display:block;touch-action:none;max-width:100%;max-height:100%}.lx-snake .sn-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:color-mix(in srgb,var(--window-bg) 88%,transparent);text-align:center;padding:15px}.lx-snake .sn-overlay[hidden]{display:none}.lx-snake h2{margin:0;color:var(--accent);letter-spacing:4px}.lx-snake .sn-help{color:var(--text-dim);font-size:11px;text-align:center;line-height:1.6}
`;
        document.head.append(style);
    }
    os.registerApp({
        id: 'snake', title: 'Snake', desktop: true, startMenu: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h12a5 5 0 0 1 0 10H8a2 2 0 0 0 0 4h12v4H8a6 6 0 0 1 0-12h8a1 1 0 0 0 0-2H4z"/></svg>',
        defaultSize: { w: 520, h: 560 }, minSize: { w: 280, h: 340 },
        onOpen(ctx) {
            ctx.body.style.padding = '14px';
            const root = document.createElement('div');
            root.className = 'lx-snake';
            root.innerHTML = `<div class="sn-header"><div class="sn-stats"><span>SCORE <strong class="sn-score">0</strong></span><span>BEST <strong class="sn-best">0</strong></span></div><button class="sn-pause" type="button">Pause</button></div><div class="sn-arena"><canvas aria-label="Snake game board"></canvas><div class="sn-overlay"><h2>SNAKE</h2><span class="sn-message" role="status">Eat. Grow. Survive.</span><button class="sn-start" type="button">Start game</button></div></div><div class="sn-help">ARROWS / WASD · Swipe to turn<br>P / SPACE pause · Stay inside the grid</div>`;
            ctx.body.append(root);
            const canvas = root.querySelector('canvas');
            const pen = canvas.getContext('2d');
            const arena = root.querySelector('.sn-arena');
            const overlay = root.querySelector('.sn-overlay');
            const heading = root.querySelector('h2');
            const message = root.querySelector('.sn-message');
            const startButton = root.querySelector('.sn-start');
            const pauseButton = root.querySelector('.sn-pause');
            const scoreLabel = root.querySelector('.sn-score');
            const bestLabel = root.querySelector('.sn-best');
            const stored = os.settings.get('snake.highscore', 0);
            let best = Number.isFinite(stored) && stored >= 0 ? Math.floor(stored) : 0;
            let snake = [], direction = { x: 1, y: 0 }, turns = [], food, score = 0;
            let state = 'ready', frame = 0, previous = 0, elapsed = 0, size = 0, closed = false, notified = false;
            const cells = 22;
            bestLabel.textContent = best;
            function spawnFood() {
                const empty = [];
                for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
                    if (!snake.some(part => part.x === x && part.y === y)) empty.push({ x, y });
                }
                food = empty[Math.floor(Math.random() * empty.length)] || null;
            }
            function draw() {
                if (!size || !pen) return;
                const theme = getComputedStyle(root);
                const accent = theme.getPropertyValue('--accent').trim() || '#ff2a2a';
                const bright = theme.getPropertyValue('--text-bright').trim() || '#fff';
                const unit = size / cells;
                pen.clearRect(0, 0, size, size);
                pen.strokeStyle = accent; pen.globalAlpha = 0.12; pen.lineWidth = 0.5;
                pen.beginPath();
                for (let n = 0; n <= cells; n++) { pen.moveTo(n * unit, 0); pen.lineTo(n * unit, size); pen.moveTo(0, n * unit); pen.lineTo(size, n * unit); }
                pen.stroke(); pen.globalAlpha = 1;
                if (food) {
                    pen.shadowColor = accent; pen.shadowBlur = 14; pen.fillStyle = bright;
                    pen.beginPath(); pen.arc((food.x + 0.5) * unit, (food.y + 0.5) * unit, unit * 0.29, 0, Math.PI * 2); pen.fill();
                }
                snake.forEach((part, i) => {
                    pen.fillStyle = i === 0 ? bright : accent; pen.shadowColor = accent; pen.shadowBlur = i === 0 ? 14 : 7;
                    pen.fillRect(part.x * unit + 1.5, part.y * unit + 1.5, unit - 3, unit - 3);
                });
                pen.shadowBlur = 0;
            }
            function resize() {
                size = Math.max(1, Math.floor(Math.min(arena.clientWidth, arena.clientHeight)));
                const ratio = window.devicePixelRatio || 1;
                canvas.width = Math.round(size * ratio); canvas.height = Math.round(size * ratio);
                canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
                pen?.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
            }
            function show(title, text, label) {
                heading.textContent = title; message.textContent = text; startButton.textContent = label; overlay.hidden = false;
                pauseButton.textContent = state === 'paused' ? 'Resume' : 'Pause';
                pauseButton.disabled = state === 'ready' || state === 'over';
            }
            function pause() {
                if (state !== 'running') return;
                state = 'paused'; cancelAnimationFrame(frame); previous = 0;
                show('PAUSED', 'Resume when you’re ready.', 'Resume');
            }
            function finish(won = false) {
                state = 'over';
                show(won ? 'GRID COMPLETE' : 'GAME OVER', `Score ${score} · Best ${best}`, 'Play again');
                ctx.setTitle('Snake — ' + score + ' points');
            }
            function tick() {
                if (turns.length) direction = turns.shift();
                const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
                const eating = food && head.x === food.x && head.y === food.y;
                const solid = eating ? snake : snake.slice(0, -1);
                if (head.x < 0 || head.y < 0 || head.x >= cells || head.y >= cells || solid.some(part => part.x === head.x && part.y === head.y)) { finish(); return; }
                snake.unshift(head);
                if (!eating) snake.pop();
                else {
                    score += 10; scoreLabel.textContent = score;
                    if (score > best) {
                        best = score; bestLabel.textContent = best; os.settings.set('snake.highscore', best);
                        if (!notified) { notified = true; os.notify({ title: 'Snake — new high score', body: `${best} points. Keep growing!` }); }
                    }
                    spawnFood(); if (!food) finish(true);
                }
            }
            function animate(now) {
                if (closed || state !== 'running') return;
                if (!ctx.win.classList.contains('is-focused') || ctx.win.hidden || document.hidden) { pause(); return; }
                elapsed += previous ? Math.min(now - previous, 250) : 0; previous = now;
                const interval = Math.max(55, 150 - Math.floor(score / 30) * 9);
                if (elapsed >= interval) { elapsed %= interval; tick(); }
                draw(); if (state === 'running') frame = requestAnimationFrame(animate);
            }
            function start() {
                if (state !== 'paused') {
                    snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }];
                    direction = { x: 1, y: 0 }; turns = []; score = 0; notified = false; scoreLabel.textContent = '0'; spawnFood();
                }
                state = 'running'; overlay.hidden = true; pauseButton.disabled = false; pauseButton.textContent = 'Pause';
                previous = 0; elapsed = 0; ctx.setTitle('Snake'); ctx.body.focus({ preventScroll: true });
                cancelAnimationFrame(frame); frame = requestAnimationFrame(animate);
            }
            function turn(x, y) {
                if (state !== 'running' || turns.length >= 2) return;
                const last = turns[turns.length - 1] || direction;
                if ((last.x === x && last.y === y) || (last.x === -x && last.y === -y)) return;
                turns.push({ x, y });
            }
            startButton.addEventListener('click', start);
            pauseButton.addEventListener('click', () => state === 'paused' ? start() : pause());
            ctx.body.addEventListener('focusout', event => {
                if (!ctx.win.contains(event.relatedTarget)) pause();
            });
            ctx.body.addEventListener('keydown', event => {
                if (!ctx.win.classList.contains('is-focused') || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLButtonElement) return;
                const key = event.key.toLowerCase();
                const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
                if (moves[key]) { event.preventDefault(); turn(...moves[key]); }
                else if ((key === 'p' || key === ' ') && !event.repeat) { event.preventDefault(); state === 'running' ? pause() : start(); }
            });
            let touch = null;
            canvas.addEventListener('pointerdown', event => { touch = { x: event.clientX, y: event.clientY, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); ctx.body.focus({ preventScroll: true }); });
            canvas.addEventListener('pointerup', event => {
                if (!touch || touch.id !== event.pointerId) return;
                const dx = event.clientX - touch.x, dy = event.clientY - touch.y; touch = null;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
                Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
            });
            canvas.addEventListener('pointercancel', () => { touch = null; });
            const focusObserver = new MutationObserver(() => { if (!ctx.win.classList.contains('is-focused') || ctx.win.hidden) pause(); });
            focusObserver.observe(ctx.win, { attributes: true, attributeFilter: ['class', 'hidden'] });
            const visibility = () => { if (document.hidden) pause(); };
            const blur = () => pause();
            document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
            const settingsChanged = () => draw();
            os.settings.addEventListener('change', settingsChanged);
            ctx.onResize(resize);
            ctx.onClose(() => { closed = true; cancelAnimationFrame(frame); focusObserver.disconnect(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); os.settings.removeEventListener('change', settingsChanged); });
            snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }]; spawnFood(); show('SNAKE', 'Eat. Grow. Survive.', 'Start game'); resize();
        }
    });
})();
