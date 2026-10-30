(() => {
    'use strict';
    const os = window.LennoxOS;
    const make = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
    // A bounded recursive-descent parser; no executable input reaches the runtime.
    function evaluate(source, programmer, base) {
        if (!source.trim() || source.length > 512) throw new Error('Enter an expression (maximum 512 characters).');
        const tokens = source.match(programmer ? /(?:0x[\da-f]+|0b[01]+|0o[0-7]+|[\da-f]+)|<<|>>>|>>|[()+\-*/&|^~]/gi : /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?|[()+\-*/%]/gi) || [];
        if (tokens.join('').toLowerCase() !== source.replace(/\s/g, '').toLowerCase()) throw new Error('Invalid character.');
        let pos = 0;
        const levels = programmer ? [['|'], ['^'], ['&'], ['<<', '>>', '>>>'], ['+', '-'], ['*', '/']] : [['+', '-'], ['*', '/']];
        const wrap = n => programmer ? BigInt.asUintN(32, n) : n;
        function number(token) {
            if (!programmer) { const n = Number(token); if (!Number.isFinite(n)) throw new Error('Number is too large.'); return n; }
            if (/^0[xob]/i.test(token)) return wrap(BigInt(token));
            const alphabet = '0123456789abcdef';
            let n = 0n;
            for (const char of token.toLowerCase()) { const digit = alphabet.indexOf(char); if (digit < 0 || digit >= base) throw new Error('Digit is not valid in this base.'); n = wrap(n * BigInt(base) + BigInt(digit)); }
            return n;
        }
        function atom(depth) {
            if (depth > 32) throw new Error('Too many nested parentheses.');
            const token = tokens[pos++]; let value;
            if (token === '+' || token === '-' || (programmer && token === '~')) { const n = atom(depth + 1); value = token === '-' ? -n : token === '~' ? ~n : n; }
            else if (token === '(') { value = expression(0, depth + 1); if (tokens[pos++] !== ')') throw new Error('Missing closing parenthesis.'); }
            else if (token && /^(?:\d|\.|[a-f])/i.test(token)) value = number(token);
            else throw new Error('Expected a number.');
            while (!programmer && tokens[pos] === '%') { pos++; value /= 100; }
            return wrap(value);
        }
        function expression(level, depth) {
            if (level === levels.length) return atom(depth);
            let left = expression(level + 1, depth);
            while (levels[level].includes(tokens[pos])) {
                const op = tokens[pos++], right = expression(level + 1, depth);
                if (op === '/' && right === (programmer ? 0n : 0)) throw new Error('Cannot divide by zero.');
                if (['<<', '>>', '>>>'].includes(op) && (right < 0n || right > 31n)) throw new Error('Shift must be between 0 and 31.');
                switch (op) {
                case '+': left += right; break; case '-': left -= right; break;
                case '*': left *= right; break; case '/': left /= right; break;
                case '&': left &= right; break; case '|': left |= right; break; case '^': left ^= right; break;
                case '<<': left <<= right; break; case '>>': case '>>>': left >>= right; break;
                }
                left = wrap(left);
            }
            return left;
        }
        const result = expression(0, 0);
        if (pos !== tokens.length) throw new Error('Unexpected token.');
        if (!programmer && !Number.isFinite(result)) throw new Error('Result is too large.');
        return result;
    }
    os.registerApp({
        id: 'calculator', title: 'Calculator', startMenu: true,
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h14v20H5zm2 2v5h10V4zm0 8v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zM7 16v2h2v-2zm4 0v2h2v-2zm4 0v4h2v-4z"/></svg>',
        defaultSize: { w: 340, h: 510 }, minSize: { w: 300, h: 440 },
        onOpen(ctx) {
            if (!document.getElementById('app-calculator-style')) {
                const style = make('style'); style.id = 'app-calculator-style';
                style.textContent = `.lx-calc{height:100%;overflow:auto;padding:12px;box-sizing:border-box;background:var(--window-bg);color:var(--text-bright);font:12px ui-monospace,monospace}.lx-calc *{box-sizing:border-box}.lx-calc button,.lx-calc input,.lx-calc select{font:inherit;color:inherit;border:1px solid var(--window-border);background:var(--desktop-bg);border-radius:5px;padding:8px;min-width:0}.lx-calc button{cursor:pointer}.lx-calc button:hover,.lx-calc button[aria-selected=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 15%,var(--window-bg))}.lx-calc :focus-visible{outline:2px solid var(--accent);outline-offset:1px}.lx-calc .tabs{display:flex;gap:4px;margin-bottom:12px}.lx-calc .tabs button{flex:1;padding:7px 3px}.lx-calc .display{width:100%;font-size:23px;text-align:right;padding:14px 8px}.lx-calc .status{min-height:31px;padding:7px 0;color:var(--text-dim);overflow-wrap:anywhere}.lx-calc .keys{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.lx-calc .keys button{min-height:37px;font-size:15px}.lx-calc .equals{background:var(--accent);color:var(--window-bg)}.lx-calc .conversions{display:grid;grid-template-columns:40px 1fr;gap:5px;margin:10px 0;overflow-wrap:anywhere}.lx-calc details{margin-top:12px;border-top:1px solid var(--window-border);padding-top:9px}.lx-calc summary{cursor:pointer}.lx-calc .history button{display:block;width:100%;text-align:right;margin-top:5px;overflow-wrap:anywhere}.lx-calc label{display:block;margin:12px 0 6px}.lx-calc .subnet-input{width:100%}.lx-calc dl{display:grid;grid-template-columns:1fr 1fr;gap:10px 5px}.lx-calc dd{margin:0;overflow-wrap:anywhere}.lx-calc dt{color:var(--text-dim)}.lx-calc .hint{line-height:1.6;color:var(--text-dim)}`;
                document.head.append(style);
            }
            ctx.body.style.padding = '0';
            const root = make('div', undefined, 'lx-calc'); ctx.body.append(root);
            const tabs = make('div', undefined, 'tabs'); tabs.setAttribute('role', 'tablist'); root.append(tabs);
            const content = make('div'); root.append(content);
            let mode = 'Standard', base = 10; const values = { Standard: '', Programmer: '' }, history = [];
            const tabButtons = [];
            function button(label, action, parent, cls) { const b = make('button', label, cls); b.type = 'button'; b.addEventListener('click', action); parent.append(b); return b; }
            for (const name of ['Standard', 'Programmer', 'Subnet']) { const b = button(name, () => { mode = name; render(); }, tabs); b.setAttribute('role', 'tab'); tabButtons.push(b); }
            function render() {
                tabButtons.forEach(b => b.setAttribute('aria-selected', String(b.textContent === mode))); content.replaceChildren();
                if (mode === 'Subnet') { renderSubnet(); return; }
                const programmer = mode === 'Programmer';
                if (programmer) {
                    const label = make('label', 'Input base · unsigned 32-bit'); const select = make('select'); select.setAttribute('aria-label', 'Input base');
                    for (const [name, radix] of [['HEX', 16], ['DEC', 10], ['OCT', 8], ['BIN', 2]]) { const option = make('option', name); option.value = radix; select.append(option); }
                    select.value = base; select.addEventListener('change', () => { try { const n = evaluate(values[mode] || '0', true, base); base = Number(select.value); values[mode] = n.toString(base).toUpperCase(); } catch (_) { base = Number(select.value); values[mode] = ''; } render(); }); label.append(select); content.append(label);
                }
                const input = make('input', undefined, 'display'); input.type = 'text'; input.value = values[mode]; input.maxLength = 512; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('aria-label', mode + ' expression'); content.append(input);
                const status = make('div', '', 'status'); status.setAttribute('role', 'status'); content.append(status);
                const conversions = make('div', undefined, 'conversions');
                function convert() { if (!programmer) return; conversions.replaceChildren(); try { const n = evaluate(input.value || '0', true, base); for (const [name, radix] of [['HEX', 16], ['DEC', 10], ['OCT', 8], ['BIN', 2]]) conversions.append(make('span', name), make('span', n.toString(radix).toUpperCase())); } catch (_) { conversions.append(make('span', '—')); } }
                if (programmer) content.append(conversions);
                function edit(key) {
                    status.textContent = '';
                    if (key === 'C' || key === 'Delete') input.value = '';
                    else if (key === '⌫' || key === 'Backspace') input.value = input.value.slice(0, -1);
                    else if (key === '±') input.value = input.value ? '-(' + input.value + ')' : '-';
                    else if (key === '=' || key === 'Enter') {
                        try {
                            const expr = input.value, result = evaluate(expr, programmer, base);
                            input.value = programmer ? result.toString(base).toUpperCase() : String(Number(result.toPrecision(12)));
                            history.unshift({ expression: expr, result: input.value, mode, base }); history.splice(30); renderHistory();
                        } catch (error) { status.textContent = error.message; }
                    } else if (input.value.length + key.length <= 512) input.value += key;
                    values[mode] = input.value; convert(); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
                }
                input.addEventListener('input', () => { values[mode] = input.value; status.textContent = ''; convert(); });
                const keys = make('div', undefined, 'keys'); content.append(keys);
                const labels = programmer ? ['C', '⌫', '(', ')', 'A', 'B', 'C hex', 'D', 'E', 'F', '<<', '>>', '7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '~', '0', '=', '+', 'AND', 'OR', 'XOR', '±'] : ['C', '⌫', '(', ')', '%', '±', '/', '*', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '00', 'History'];
                for (const label of labels) button(label, () => label === 'History' ? (details.open = !details.open) : edit(({ AND: '&', OR: '|', XOR: '^', 'C hex': 'c' })[label] || label), keys, label === '=' ? 'equals' : '');
                const details = make('details'); details.append(make('summary', 'History')); const list = make('div', undefined, 'history'); details.append(list); content.append(details);
                function renderHistory() { list.replaceChildren(); if (!history.length) list.append(make('p', 'No calculations yet.')); for (const item of history) button(item.expression + ' = ' + item.result + (item.mode === 'Programmer' ? ' [base ' + item.base + ']' : ''), () => { mode = item.mode; base = item.base; values[mode] = item.result; render(); }, list); }
                renderHistory(); convert();
                content.append(make('p', programmer ? '32-bit wraparound · logical shifts · integer division. Prefix literals with 0x, 0o or 0b.' : 'Enter = result · Delete or C = clear · % divides by 100.', 'hint'));
                content.onkeydown = event => {
                    if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Escape' || event.target.tagName === 'SELECT') return;
                    if (event.key === 'Enter' && event.target === input) { event.preventDefault(); edit('Enter'); }
                    else if (event.key === 'Backspace' && event.target !== input) { event.preventDefault(); edit('Backspace'); }
                    else if (event.key === 'Delete' || (!programmer && event.key.toLowerCase() === 'c')) { event.preventDefault(); edit('C'); }
                    else if (event.target !== input && /^[0-9.+\-*/()%&|^~a-f]$/i.test(event.key)) { event.preventDefault(); edit(event.key); }
                };
                input.focus();
            }
            function renderSubnet() {
                content.onkeydown = null;
                const label = make('label', 'IPv4 address / CIDR'); const input = make('input', undefined, 'subnet-input'); input.value = '192.168.10.42/24'; input.setAttribute('aria-label', 'IPv4 address and CIDR'); label.append(input); content.append(label);
                const status = make('p'); status.setAttribute('role', 'status'); const output = make('dl');
                function calculate() {
                    output.replaceChildren(); status.textContent = '';
                    const match = input.value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
                    if (!match || match.slice(1, 5).some(x => Number(x) > 255) || Number(match[5]) > 32) { status.textContent = 'Use a valid IPv4/CIDR, e.g. 192.168.10.42/24.'; return; }
                    const cidr = Number(match[5]), ip = match.slice(1, 5).reduce((n, x) => n * 256 + Number(x), 0), count = 2 ** (32 - cidr), network = Math.floor(ip / count) * count, broadcast = network + count - 1;
                    const format = n => [24, 16, 8, 0].map(shift => Math.floor(n / 2 ** shift) % 256).join('.');
                    const rows = [['Network', format(network) + '/' + cidr], ['Broadcast', cidr >= 31 ? 'N/A (' + (cidr === 31 ? 'point-to-point' : 'host route') + ')' : format(broadcast)], ['First host', format(network + (cidr < 31 ? 1 : 0))], ['Last host', format(broadcast - (cidr < 31 ? 1 : 0))], ['Usable hosts', (cidr < 31 ? count - 2 : count).toLocaleString()], ['Mask', format(4294967296 - count)], ['Wildcard', format(count - 1)]];
                    for (const [key, value] of rows) output.append(make('dt', key), make('dd', value));
                }
                button('Calculate subnet', calculate, content); content.append(status, output, make('p', '/31 uses both addresses (RFC 3021); /32 is a single host route.', 'hint')); input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calculate(); } }); calculate();
            }
            render(); ctx.onFocus(() => { const input = content.querySelector('input'); if (input) input.focus(); });
        }
    });
})();
