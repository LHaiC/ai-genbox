/* UI layer: every diagram reads the deterministic core model in core.js.
   Source panels are embedded, so both file:// and HTTP run without fetch(). */
(function () {
    'use strict';
    const E = window.EDA, $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)], labs = {};
    window.__LABS = labs;
    window.__APP_ERRORS = [];
    const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = (n, d = 3) => n === null || n === undefined ? '—' : n === Infinity ? '∞' : !Number.isFinite(n) ? '—' : Number(n.toFixed(d)).toString();
    const val = id => +document.getElementById(id).value, str = id => document.getElementById(id).value, checked = id => document.getElementById(id).checked;
    function select(id, label, options, initial) { return `<div class="control"><label for="${id}">${label}</label><select id="${id}" data-param>${options.map(([v, t]) => `<option value="${v}" ${v === initial ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`; }
    function slider(id, label, min, max, step, value, unit = '') { return `<div class="control"><label for="${id}">${label}<output for="${id}" data-value="${id}" data-unit="${unit}">${value}${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-param></div>`; }
    function checkbox(id, label, on = true) { return `<label class="check-control" for="${id}"><input id="${id}" type="checkbox" ${on ? 'checked' : ''} data-param>${label}</label>`; }
    function metric(label, value, unit = '', cls = '') { return `<div class="metric"><span>${label}</span><b class="${cls}">${value}</b>${unit ? `<small>${unit}</small>` : ''}</div>`; }
    function status(text, kind = '') { return `<div class="status ${kind}" role="status">${text}</div>`; }
    function table(headers, rows, classes = '') { return `<div class="table-scroll ${classes}"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`; }
    function row(cells, cls = '') { return `<tr class="${cls}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`; }
    function updateValues(el) { $$('output[data-value]', el).forEach(o => { o.textContent = fmt(val(o.dataset.value), 4) + (o.dataset.unit || ''); }); }
    function tex(text, display = false) { try {
        return katex.renderToString(text, { output: 'mathml', displayMode: display, throwOnError: true, strict: 'ignore', trust: false });
    }
    catch (e) {
        window.__APP_ERRORS.push(e.message);
        return `<span class="katex-error">${esc(text)}</span>`;
    } }
    function renderMath(root) { const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) { if (n.parentElement?.closest('pre,code,script,style,math,.katex'))
            return NodeFilter.FILTER_REJECT; return /\\\(|\\\[/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } }); const nodes = []; while (walker.nextNode())
        nodes.push(walker.currentNode); for (const n of nodes) {
        const text = n.nodeValue, regex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
        let m, last = 0, frag = document.createDocumentFragment();
        while ((m = regex.exec(text))) {
            frag.append(document.createTextNode(text.slice(last, m.index)));
            const span = document.createElement('span');
            span.className = m[1] !== undefined ? 'display-math-wrap' : 'inline-math-wrap';
            span.innerHTML = tex(m[1] ?? m[2], m[1] !== undefined);
            frag.append(span);
            last = regex.lastIndex;
        }
        frag.append(document.createTextNode(text.slice(last)));
        n.replaceWith(frag);
    } scheduleMathAlign(); }
    window.renderCourseMath = renderMath;
    /* Inline math keeps visible overflow so its baseline is the text baseline. Formulas wider than their
       column need a scroll container, whose baseline is its bottom edge, so those get that lift measured
       back out. Runs after rendering, resizing and font-size changes. */
    function alignWideMath(root = document) { for (const s of root.querySelectorAll('.inline-math-wrap,span[data-math]:not(.equation)')) {
        if (s.scrollWidth <= s.clientWidth + 1) {
            if (s.classList.contains('math-wide')) {
                s.classList.remove('math-wide');
                s.style.verticalAlign = '';
            }
            continue;
        }
        s.classList.add('math-wide');
        const katex = s.querySelector('.katex');
        if (!katex)
            continue;
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        katex.after(probe);
        const drop = s.getBoundingClientRect().bottom - probe.getBoundingClientRect().bottom;
        probe.remove();
        s.style.verticalAlign = `${-drop.toFixed(2)}px`;
    } }
    var mathFrame = 0;
    function scheduleMathAlign() { cancelAnimationFrame(mathFrame);
        mathFrame = requestAnimationFrame(() => alignWideMath()); }
    addEventListener('resize', scheduleMathAlign, { passive: true });
    function svg(inner, w = 520, h = 320, title = '计算可视化') { return `<div class="diagram-scroll" tabindex="0" role="region" aria-label="${esc(title)}；窄屏可横向移动"><svg style="width:${w+64}px;min-width:${w+64}px" viewBox="-32 -32 ${w+64} ${h+64}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${inner}</svg></div>`; }
    function line(x1, y1, x2, y2, cls = 'edge', extra = '') { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`; }
    function circle(x, y, r = 17, cls = 'point', extra = '') { return `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}" ${extra}/>`; }
    function text(x, y, t, cls = '', anchor = 'middle', extra = '') { return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`; }
    function path(points, cls = 'accent-edge', extra = '') { return `<polyline points="${points.map(p => p.join(',')).join(' ')}" class="${cls}" ${extra}/>`; }
    function plot(series, { xmin = 0, xmax = 1, ymin = 0, ymax = 1, w = 480, h = 230, xticks = [], yticks = [], point = null, xlabel = '', ylabel = '', asymptote = null } = {}) {
        const m = { l: 68, r: 30, t: 42, b: 58 }, sx = x => m.l + (x - xmin) / (xmax - xmin) * (w - m.l - m.r), sy = y => h - m.b - (y - ymin) / (ymax - ymin) * (h - m.t - m.b);
        let s = '';
        for (const y of yticks) {
            s += line(m.l, sy(y), w - m.r, sy(y), 'gridline') + text(m.l - 9, sy(y) + 4, fmt(y, 2), '', 'end');
        }
        for (const t of xticks) {
            const [x, label] = Array.isArray(t) ? t : [t, fmt(t, 1)];
            s += line(sx(x), h - m.b, sx(x), h - m.b + 5, 'gridline') + text(sx(x), h - 30, label);
        }
        s += line(m.l, m.t, m.l, h - m.b, 'gridline') + line(m.l, h - m.b, w - m.r, h - m.b, 'gridline');
        if (asymptote !== null && Number.isFinite(asymptote) && asymptote >= ymin && asymptote <= ymax)
            s += line(m.l, sy(asymptote), w - m.r, sy(asymptote), 'orange-edge', 'stroke-dasharray="5 5" opacity=".5"');
        series.forEach((r, i) => s += path(r.points.map(([x, y]) => [sx(x), sy(y)]), r.cls || (i ? 'orange-edge' : 'accent-edge')));
        if (point)
            s += line(sx(point[0]), sy(point[1]), sx(point[0]), h - m.b, 'gridline', 'stroke-dasharray="3 4"') + circle(sx(point[0]), sy(point[1]), 5, 'active-point');
        s += text(w - m.r, h - 3, xlabel, 'small-label', 'end') + text(m.l, m.t - 12, ylabel, 'small-label', 'start');
        return svg(s, w, h, '由参数即时计算的函数曲线');
    }
    function buttons() { return `<div class="stepper"><button type="button" data-act="back">← 上一步</button><button type="button" data-act="next" class="primary">下一步 →</button><button type="button" data-act="finish">运行到末尾</button><button type="button" data-act="reset">重置</button><span class="counter" aria-live="polite"></span></div>`; }
    function player(id, controls, compute, draw, { bind = true, note = '改变输入会重新初始化本次过程。' } = {}) {
        const el = $(`#lab-${id} .lab-ui`);
        el.innerHTML = `<div class="controls">${controls}</div><div class="notice-error" hidden></div><div class="lab-display"></div>${buttons()}<p class="lab-note">${note}</p>`;
        let trace = [], cursor = 0, result = null;
        const api = { el, getState: () => E.clone(trace[cursor]), getTrace: () => trace, getResult: () => result, getCursor: () => cursor, setCursor(i) { cursor = Math.max(0, Math.min(trace.length - 1, i)); paint(); }, rebuild() { updateValues(el); try {
                result = compute();
                trace = Array.isArray(result) ? result : result.trace;
                cursor = 0;
                checkTrace();
                $('.notice-error', el).hidden = true;
                paint();
            }
            catch (e) {
                $('.notice-error', el).hidden = false;
                $('.notice-error', el).textContent = '输入无效：' + e.message + '。仍显示上一次有效输入的计算。';
            } }, render: () => paint() };
        function checkTrace() { if (!Array.isArray(trace) || !trace.length)
            throw new Error('Empty trace'); }
        function paint() { if (!trace.length)
            return; $('.lab-display', el).innerHTML = draw(trace[cursor], cursor, trace, result); el.dataset.step = cursor; el.dataset.steps = trace.length; $('.counter', el).textContent = `${cursor} / ${trace.length - 1}`; $('[data-act=back]', el).disabled = cursor === 0; $('[data-act=next]', el).disabled = cursor === trace.length - 1; $('[data-act=finish]', el).disabled = cursor === trace.length - 1; }
        el.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b)
            return; if (b.dataset.act === 'back')
            api.setCursor(cursor - 1); if (b.dataset.act === 'next')
            api.setCursor(cursor + 1); if (b.dataset.act === 'finish')
            api.setCursor(trace.length - 1); if (b.dataset.act === 'reset')
            api.setCursor(0); });
        if (bind)
            el.addEventListener('input', e => { if (e.target.matches('[data-param]'))
                api.rebuild(); });
        labs[id] = api;
        api.rebuild();
        return api;
    }
    const boolPresets = { mux: { name: '原例题：ab + ¬a·c', fn: (a, b, c) => (a & b) | ((1 - a) & c) }, and: { name: '与门：a·b', fn: (a, b) => a & b }, or: { name: '或门：a+b', fn: (a, b) => a | b }, xor: { name: '异或门：a⊕b', fn: (a, b) => a ^ b }, not: { name: '非门：¬a', fn: a => 1 - a }, quiz: { name: '原习题：ab + ¬a', fn: (a, b) => (a & b) | (1 - a) } };
    function initBoolean() {
        const el = $('#lab-boolean .lab-ui');
        let tt = E.truth(boolPresets.mux.fn), input = [0, 1, 0], variable = 0;
        el.innerHTML = `<div class="controls">${select('bool-preset', '函数预设', Object.entries(boolPresets).map(([k, v]) => [k, v.name]), 'mux')}${select('bool-variable', '要消去的变量', [['0', 'a'], ['1', 'b'], ['2', 'c']], '0')}</div><div class="binary-inputs" aria-label="当前输入"></div><div class="bool-display"></div><p class="lab-note">a 是最高位，行号为 4a+2b+c；真值表按钮可直接改 F。一个子函数有 4 行，不是一个常数。</p>`;
        function render() {
            variable = val('bool-variable');
            const c = E.cofactors(tt, variable), idx = input.reduce((s, b) => 2 * s + b, 0), rest = input.filter((_, i) => i !== variable), r = c.find(x => x.rest.join('') === rest.join('')), v = 'abc'[variable];
            $('.binary-inputs', el).innerHTML = input.map((x, i) => `<button data-input="${i}" class="${x ? 'on' : ''}" aria-label="翻转输入 ${'abc'[i]}" aria-pressed="${!!x}">${'abc'[i]} = ${x}</button>`).join('');
            const rows = tt.map((f, i) => row([...E.bits(i, 3), `<button class="truth-bit ${f ? 'on' : ''}" data-bit="${i}" aria-label="翻转真值表第 ${i} 行输出" aria-pressed="${!!f}">${f}</button>`], i === idx ? 'selected-row' : ''));
            const deps = c.map(x => row([x.rest.join(''), x.f0, x.f1, x.diff, x.exists, x.forall], x.rest.join('') === rest.join('') ? 'selected-row' : ''));
            let diagram = `<rect x="26" y="22" width="140" height="54" rx="6" class="${input[variable] ? 'highlight-bg' : 'node-bg'}"/><rect x="26" y="150" width="140" height="54" rx="6" class="${input[variable] ? 'node-bg' : 'highlight-bg'}"/>`;
            diagram += text(96, 44, `F(${v}=1)`, 'label') + text(96, 65, r.f1) + text(96, 171, `F(${v}=0)`, 'label') + text(96, 193, r.f0);
            diagram += line(166, 49, 256, 89, input[variable] ? 'accent-edge' : 'edge') + line(166, 177, 256, 136, !input[variable] ? 'accent-edge' : 'edge') + `<path d="M256 60 L316 84 L316 145 L256 168Z" class="highlight-bg"/>` + text(284, 117, 'MUX', 'label') + line(316, 114, 410, 114, 'accent-edge') + text(383, 98, `F = ${tt[idx]}`, 'label') + text(285, 202, `${v}=${input[variable]}`, 'label');
            $('.bool-display', el).innerHTML = `<div class="lab-split equal"><div><span class="truth-label">完整函数 · 点击输出编辑</span>${table(['a', 'b', 'c', 'F'], rows)}</div><div><div class="viz">${svg(diagram, 440, 228, '香农展开选择器：选中的子函数决定输出')}</div>${status(`当前 ${v}=${input[variable]}，选择 F${input[variable]}=${input[variable] ? r.f1 : r.f0}。重组输出 = ${tt[idx]}。`)}</div></div><span class="truth-label">消去 ${v} 之后 · 行变量 ${'abc'.split('').filter((_, i) => i !== variable).join('')}</span>${table(['剩余输入', 'F₀', 'F₁', '∂F', '∃ ' + v, '∀ ' + v], deps, 'min-table')}<div class="status neutral" data-test="boolean-check">香农重组逐行核验：8 / 8 一致。差分与量词直接从 F₀、F₁ 重算。</div>`;
        }
        el.addEventListener('input', e => { if (e.target.id === 'bool-preset')
            tt = E.truth(boolPresets[str('bool-preset')].fn); render(); });
        el.addEventListener('click', e => { const b = e.target.closest('[data-bit],[data-input]'); if (!b)
            return; if (b.hasAttribute('data-bit')) {
            const i = +b.dataset.bit;
            tt[i] ^= 1;
        }
        else
            input[+b.dataset.input] ^= 1; render(); });
        labs.boolean = { el, getState: () => ({ table: tt.slice(), input: input.slice(), variable }), reset() { tt = E.truth(boolPresets.mux.fn); input = [0, 1, 0]; render(); } };
        render();
    }
    function initRepair() {
        const sols = E.repairSolutions(), api = player('repair', '<span class="field-label">配置位按 d₀ d₁ d₂ d₃ 排列；可点击翻转，也可依次枚举。</span>', () => E.range(16).map(i => { const d = E.bits(i, 4); return { d, rows: E.repair(d) }; }), (s, i) => {
            const good = s.rows.every(r => r.ok), pass = s.rows.filter(r => r.ok).length;
            return `<div class="binary-inputs">${s.d.map((x, k) => `<button class="${x ? 'on' : ''}" data-config="${k}" aria-pressed="${!!x}">d${'₀₁₂₃'[k]}=${x}</button>`).join('')}</div><div class="lab-split"><div>${table(['a b', 's₁ s₀', '入口', '目标 f', 'G', '相等?'], s.rows.map(r => row([`${r.a} ${r.b}`, `${r.s1} ${r.s0}`, `d${r.index}`, r.f, r.g, r.ok ? '✓' : '✕'], r.ok ? '' : 'warning-row')))}</div><div class="insight"><div class="metrics">${metric('全输入核验', pass + '/4', '', '' + (good ? 'good' : 'bad'))}${metric('被访问的入口', new Set(s.rows.map(r => r.index)).size, '共有 4 个 MUX 入口')}</div><p>合法配置：</p>${sols.map(d => `<button data-solution="${d.reduce((a, b) => 2 * a + b, 0)}">${d.join(' ')}</button>`).join(' ')}<p class="lab-note">d₃ 的选择线状态 11 不可达：ab=1 要求 b=1，而 ¬b=1 要求 b=0。</p></div></div>${status(good ? '本配置对所有 a,b 都正确。改变 d₃ 不影响这张网表的输出。' : '本配置有反例。全称量词要求四行全部通过，而不是多数通过。', good ? '' : 'warn')}`;
        }, { note: '原电路例题；明确采用 k=2s₁+s₀ 的入口编号。枚举的是配置，不是测量数据。' });
        api.el.addEventListener('click', e => { const b = e.target.closest('[data-config],[data-solution]'); if (!b)
            return; if (b.hasAttribute('data-solution'))
            api.setCursor(+b.dataset.solution);
        else {
            const d = api.getState().d;
            d[+b.dataset.config] ^= 1;
            api.setCursor(d.reduce((a, b) => 2 * a + b, 0));
        } });
    }
    function initQM() {
        let tt = E.truth(boolPresets.mux.fn);
        const presets = [['source', '原题：ab + ¬a·c + bc'], ['parity', '三输入 XOR'], ['zero', '常零'], ['one', '常一']];
        const api = player('qm', select('qm-preset', '输入函数', presets, 'source'), () => { const r = E.minimize(tt), trace = [{ phase: 'minterms', cubes: r.ones.map(i => E.bits(i, 3).join('')) }, ...r.rounds.map((x, i) => ({ phase: 'merge', round: i, ...x, cubes: x.group })), { phase: 'cover', cubes: r.cubes }]; return { ...r, trace }; }, (s, i, t, r) => {
            const buttons = table(['abc', ...E.range(8).map(k => E.bits(k, 3).join(''))], [row(['F', ...tt.map((f, k) => `<button class="truth-bit ${f ? 'on' : ''}" data-qmbit="${k}" aria-label="修改 QM 第 ${k} 行">${f}</button>`)])], 'min-table');
            const phase = s.phase === 'cover' ? '精确选择覆盖' : s.phase === 'merge' ? `合并轮次 ${s.round + 1}` : '列出所有输出为 1 的最小项';
            let merge = s.merges?.length ? s.merges.map(m => `<div class="mono">${m.from.join(' + ')} → ${m.to}</div>`).join('') : '这一层没有可合并对。';
            return `${buttons}<div class="lab-split"><div><div class="field-label">${phase}</div><div class="cube-grid">${s.cubes.length ? s.cubes.map(c => `<span class="cube ${r.primes.includes(c) ? 'prime' : ''}">${c}</span>`).join('') : '<span class="cube">空集合</span>'}</div><div class="state-code">${s.phase === 'cover' ? `最小表示：${esc(r.expression)}\n最小 literal count：${r.literal}\n项数：${r.terms}` : merge}</div></div><div class="insight"><div class="metrics">${metric('ON-set 大小', r.ones.length, '8 行中的真值行')}${metric('当前状态', i, '单步位置')}</div><p>绿色框是已知素蕴含项；只有最终精确覆盖阶段才选择需要保留的项。</p></div></div>${s.phase === 'cover' ? table(['素蕴含项', ...r.ones.map(x => E.bits(x, 3).join(''))], r.primes.map((c, k) => row([`${c}${r.cubes.includes(c) ? ' ✓' : ''}`, ...r.ones.map(x => E.cubeMatches(c, x, 3) ? '●' : '')], r.cubes.includes(c) ? 'selected-row' : ''))) : ''}${status(s.phase === 'cover' ? `最终表达式 ${esc(r.expression)} 对全部 8 个输入与原函数等价。` : '点击下一步追踪合并；合并只消去一个变化位。', s.phase === 'cover' ? '' : 'neutral')}`;
        }, { bind: false, note: '三变量 Quine–McCluskey 式合并 + prime implicant 精确覆盖搜索。不是 ESPRESSO，也不声称可扩展到大规模。' });
        api.el.addEventListener('input', e => { if (e.target.id === 'qm-preset') {
            const p = str('qm-preset');
            tt = p === 'source' ? E.truth(boolPresets.mux.fn) : p === 'parity' ? E.truth((a, b, c) => a ^ b ^ c) : Array(8).fill(p === 'one' ? 1 : 0);
            api.rebuild();
        } });
        api.el.addEventListener('click', e => { const b = e.target.closest('[data-qmbit]'); if (b) {
            tt[+b.dataset.qmbit] ^= 1;
            api.rebuild();
        } });
    }
    function treeDrawing(tree, result, upto) { const coords = {}, nodes = []; let leafNo = 0, maxDepth = 0; function pass(t, d) { maxDepth = Math.max(maxDepth, d); nodes.push(t); t.children.forEach(c => pass(c, d + 1)); if (!t.children.length)
        coords[t.id] = { leaf: leafNo++, depth: d };
    else
        coords[t.id] = { leaf: E.sum(t.children.map(c => coords[c.id].leaf)) / t.children.length, depth: d }; } pass(tree, 0); for (const c of Object.values(coords)) {
        c.x = 45 + c.leaf / Math.max(1, leafNo - 1) * 440;
        c.y = 42 + c.depth / Math.max(1, maxDepth) * 230;
    } const processed = new Set(result.trace.slice(0, upto).map(r => r.id)), current = result.trace[upto - 1]?.id; let s = ''; for (const t of nodes)
        for (const c of t.children)
            s += line(coords[t.id].x, coords[t.id].y, coords[c.id].x, coords[c.id].y); for (const t of nodes) {
        const { x, y } = coords[t.id], is = current === t.id;
        s += circle(x, y, t.op === 'IN' ? 22 : 33, is ? 'active-point' : 'point') + text(x, y + 4, t.op === 'IN' ? t.id : t.op, 'label');
        if (t.op !== 'IN')
            s += text(x, y + 42, `${t.id}: ${processed.has(t.id) ? fmt(result.memo[t.id].cost) : '?'}`);
        else
            s += text(x, y + 34, processed.has(t.id) ? 'C=0' : 'C=?');
    } return svg(s, 530, 328, '当前 subject tree 及已计算的最优子树成本'); }
    function initMapping() {
        player('mapping', select('map-case', 'Subject tree', [['oa', '(b+c)·a'], ['aoi', '¬(a·b+c)'], ['nested', '((a+b)·c)+d']], 'oa') + slider('map-oa', 'OA21 单价', 1, 9, .25, 4) + checkbox('map-swap', '交换所有可交换子树', false), () => { const tree = E.mappingCase(str('map-case'), checked('map-swap')), r = E.mapTree(tree, { NOT: 1, AND2: 3, OR2: 3, NAND2: 2, OA21: val('map-oa'), AO21: 4, AOI21: 4 }); return { ...r, tree, trace: [{ id: null, message: '从叶节点开始。' }, ...r.trace] }; }, (s, i, trace, r) => {
            const rootKnown = trace.slice(0, i + 1).some(x => x.id === r.tree.id);
            const candidates = s.candidates || [];
            return `<div class="lab-split"><div class="viz">${treeDrawing(r.tree, { ...r, trace: trace.slice(1) }, i)}</div><div class="insight"><div class="metrics">${metric('当前节点', s.id || '—')}${metric('根节点最优成本', rootKnown ? fmt(r.cost) : '待计算', '面积型教学单位')}</div><p>库价：NOT=1；AND2=3；OR2=3；OA21=${fmt(val('map-oa'))}；AO21=4；AOI21=4。</p>${s.id ? `<p>${s.cell === 'PI' ? '输入引脚是零成本边界。' : `本节点选 ${s.cell}，成本 ${fmt(s.cost)}。`}</p>` : '<p>先确定叶节点，再将代价向上传递。</p>'}</div></div>${candidates.length ? table(['模式', '边界', '库价', '子问题和', '总成本'], candidates.map(c => row([c.cell, c.boundary.join(', '), fmt(c.price), fmt(c.child), fmt(c.total)], c.total === s.cost ? 'selected-row' : ''))) : ''}${status(rootKnown ? `最终覆盖：${r.selected.map(s => `${s.id}→${s.cell}`).join('；')}。两种子树旋转都已参与匹配。` : '每个候选都必须覆盖同一根功能；模式边界之外的子树另计成本。', rootKnown ? '' : 'neutral')}`;
        }, { note: '可读 AND/OR/NOT 模式树；同一输入引脚成本为 0。树内 DP 不处理跨输出 DAG 共享，也不执行延迟驱动映射。' });
    }
    function gridAxes(w = 430, h = 405) { const sx = x => 45 + 340 * x, sy = y => 365 - 340 * y; let s = ''; for (const x of [0, .25, .5, .75, 1])
        s += line(sx(x), sy(0), sx(x), sy(1), 'gridline') + text(sx(x), 387, x); for (const y of [0, .25, .5, .75, 1])
        s += line(sx(0), sy(y), sx(1), sy(y), 'gridline') + text(30, sy(y) + 4, y, '', 'end'); s += text(404, 367, 'x', 'label') + text(46, 12, 'y', 'label'); return { s, sx, sy }; }
    function initWire() {
        let pins = [[0, 1], [1, 1], [0, 0], [1, 0]], mode = 'steiner';
        const presets = { square: [[0, 1], [1, 1], [0, 0], [1, 0]], triangle: [[0, .1], [1, .2], [.4, 1]], line: [[0, .5], [.3, .5], [.7, .5], [1, .5]], irregular: [[.1, .2], [.25, .9], [.8, .1], [.9, .7]] };
        const el = $('#lab-wire .lab-ui');
        el.innerHTML = `<div class="controls">${select('wire-case', '输入引脚', [['square', '原例：单位正方形'], ['triangle', '三个引脚'], ['line', '共线引脚'], ['irregular', '不对称四引脚']], 'square')}${select('wire-mode', '观察模型', [['steiner', '精确 RSMT + Hanan 网格'], ['hpwl', 'HPWL 包围盒'], ['clique', '未加权 L1 团模型'], ['star', '平方距离星模型']], 'steiner')}${select('wire-point', '编辑引脚', [['0', 'A'], ['1', 'B'], ['2', 'C'], ['3', 'D']], '0')}${slider('wire-x', '选中引脚 x', 0, 1, .025, 0)}${slider('wire-y', '选中引脚 y', 0, 1, .025, 1)}</div><div class="lab-split"><div class="viz wire-viz" style="touch-action:none"></div><div class="insight wire-info"></div></div><p class="lab-note">无障碍、单位网格间距按坐标计算。RSMT 为 Hanan 网格子集 DP 小实例精确解，不包含层、过孔或设计规则。</p>`;
        function sync() { const i = Math.min(val('wire-point'), pins.length - 1); $('#wire-point').value = i; $('#wire-x').value = pins[i][0]; $('#wire-y').value = pins[i][1]; $$('#wire-point option').forEach((o, k) => o.disabled = k >= pins.length); updateValues(el); }
        function render() {
            mode = str('wire-mode');
            const st = E.steiner(pins), hp = E.hpwl(pins), cl = E.cliqueL1(pins), star = E.starQuadratic(pins), a = gridAxes();
            let s = a.s;
            const point = p => [a.sx(p[0]), a.sy(p[1])];
            if (mode === 'steiner') {
                for (const x of st.xs)
                    s += line(a.sx(x), a.sy(0), a.sx(x), a.sy(1), 'gridline', 'stroke-dasharray="3 4"');
                for (const y of st.ys)
                    s += line(a.sx(0), a.sy(y), a.sx(1), a.sy(y), 'gridline', 'stroke-dasharray="3 4"');
                for (const [u, v] of st.treeEdges)
                    s += line(...point(st.vertices[u]), ...point(st.vertices[v]), 'accent-edge');
            }
            if (mode === 'hpwl') {
                const xs = pins.map(p => p[0]), ys = pins.map(p => p[1]);
                s += `<rect x="${a.sx(Math.min(...xs))}" y="${a.sy(Math.max(...ys))}" width="${340 * (Math.max(...xs) - Math.min(...xs))}" height="${340 * (Math.max(...ys) - Math.min(...ys))}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5"/>`;
            }
            if (mode === 'clique')
                for (let i = 0; i < pins.length; i++)
                    for (let j = i + 1; j < pins.length; j++)
                        s += path([point(pins[i]), point([pins[j][0], pins[i][1]]), point(pins[j])], 'orange-edge', 'opacity=".55"');
            if (mode === 'star') {
                for (const p of pins)
                    s += line(...point(p), ...point(star.center), 'accent-edge');
                s += circle(...point(star.center), 7, 'fixed-pin') + text(a.sx(star.center[0]) + 12, a.sy(star.center[1]) - 10, 's*', 'label', 'start');
            }
            pins.forEach((p, i) => { const [x, y] = point(p); if (i === val('wire-point'))
                s += circle(x, y, 13, 'active-point'); s += circle(x, y, 8, 'pin', `data-pin="${i}"`) + text(x + (p[0] > .85 ? -13 : 13), y + (p[1] > .85 ? 20 : -13), 'ABCD'[i], 'label', p[0] > .85 ? 'end' : 'start'); });
            $('.wire-viz', el).innerHTML = svg(s, 430, 405, '可拖动引脚与实时计算线长模型');
            $('.wire-info', el).innerHTML = `<div class="metrics">${metric('HPWL', fmt(hp), '长度单位')}${metric('精确 RSMT', fmt(st.length), '长度单位', 'good')}${metric('未加权 L1 clique', fmt(cl), '长度单位')}${metric('二次 star 目标', fmt(star.energy), '平方长度单位')}</div><p>HPWL / RSMT = <b>${st.length ? fmt(hp / st.length, 3) : '1（重合）'}</b>。${pins.length === 3 ? '三个引脚的无障碍直角最短连线达到 HPWL。' : ''}</p><p>质心 s* = (${fmt(star.center[0])}, ${fmt(star.center[1])})；它最小化的是平方距离和。</p>${status(mode === 'star' ? '图中的线画成直线仅表示连接关系；右侧数值是平方距离，不是这些线段长度的和。' : '拖动并观察：包围盒不一定能区分同一范围内的不同连线成本。', 'neutral')}`;
            labs.wire.result = { pins: E.clone(pins), hpwl: hp, steiner: st.length, clique: cl, star: star.energy };
        }
        labs.wire = { el, getState: () => ({ pins: E.clone(pins), mode, result: labs.wire.result }), render };
        el.addEventListener('input', e => { if (e.target.id === 'wire-case') {
            pins = E.clone(presets[str('wire-case')]);
            sync();
        }
        else if (e.target.id === 'wire-point')
            sync();
        else if (['wire-x', 'wire-y'].includes(e.target.id)) {
            pins[val('wire-point')] = [val('wire-x'), val('wire-y')];
            updateValues(el);
        } render(); });
        const viz = $('.wire-viz', el);
        let drag = null;
        viz.addEventListener('pointerdown', e => { const p = e.target.closest('[data-pin]'); if (p) {
            drag = +p.dataset.pin;
            $('#wire-point').value = drag;
            viz.setPointerCapture(e.pointerId);
            sync();
            e.preventDefault();
        } });
        viz.addEventListener('pointermove', e => { if (drag === null)
            return; const r = $('svg', viz).getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 430, y = (e.clientY - r.top) / r.height * 405; pins[drag] = [Math.max(0, Math.min(1, (x - 45) / 340)), Math.max(0, Math.min(1, (365 - y) / 340))].map(x => Math.round(x * 40) / 40); sync(); render(); });
        viz.addEventListener('pointerup', () => drag = null);
        viz.addEventListener('pointercancel', () => drag = null);
        sync();
        render();
    }
    function placementSVG(pos, { candidate = null, trace = null, anchors = true, rects = true, edges = null } = {}) {
        const sx = x => 30 + x * 45, sy = y => 290 - y * 26;
        let s = '';
        for (let v = 0; v <= 10; v += 2)
            s += line(sx(v), sy(0), sx(v), sy(10), 'gridline') + line(sx(0), sy(v), sx(10), sy(v), 'gridline');
        const all = [...pos, [0, 5], [10, 5]];
        if (edges)
            for (const [i, j] of edges)
                s += line(sx(all[i][0]), sy(all[i][1]), sx(all[j][0]), sy(all[j][1]));
        if (trace)
            for (let i = 0; i < pos.length; i++)
                s += path(trace.map(r => [sx(r.pos[i][0]), sy(r.pos[i][1])]), 'accent-edge', 'opacity=".28" stroke-width="1.5"');
        if (candidate)
            candidate.forEach(p => { s += `<rect x="${sx(p[0]) - .9 * 45}" y="${sy(p[1]) - .6 * 26}" width="${1.8 * 45}" height="${1.2 * 26}" fill="none" stroke="var(--orange)" stroke-width="1.4" stroke-dasharray="4 4"/>`; });
        pos.forEach((p, i) => { const x = sx(p[0]), y = sy(p[1]); if (rects)
            s += `<rect x="${x - .9 * 45}" y="${y - .6 * 26}" width="${1.8 * 45}" height="${1.2 * 26}" fill="var(--accent-soft)" fill-opacity=".72" stroke="var(--accent)" rx="2"/>`;
        else
            s += circle(x, y, 13, 'active-point'); s += text(x, y + 4, i + 1, 'label'); });
        if (anchors) {
            s += circle(sx(0), sy(5), 7, 'fixed-pin') + circle(sx(10), sy(5), 7, 'fixed-pin') + text(sx(0), sy(5) - 15, '固定', 'small-label') + text(sx(10), sy(5) - 15, '固定', 'small-label');
        }
        s += text(sx(0), 312, '0') + text(sx(10), 312, '10');
        return svg(s, 515, 330, '教学单元布局，所有坐标由优化状态给出');
    }
    function initSA() {
        player('sa', select('sa-case', '初始布局', [['spread', '分散'], ['cluster', '拥挤']], 'spread') + slider('sa-temp', '初始温度', 0, 15, .25, 5) + slider('sa-lambda', '重叠惩罚 λ', 0, 12, .25, 3) + slider('sa-cooling', '每步降温系数', .85, 1, .01, .95), () => {
            const pos = str('sa-case') === 'spread' ? [[1.5, 2], [4, 8], [6, 2], [8.5, 8]] : [[4.2, 4.7], [4.9, 5.1], [5.4, 4.8], [5.8, 5.2]];
            let state = { pos, seed: 20261014, temperature: val('sa-temp'), iteration: 0, energy: E.saEnergy(pos, val('sa-lambda')) };
            const trace = [state];
            for (let k = 0; k < 60; k++) {
                state = E.saStep(state, val('sa-lambda'), val('sa-cooling'));
                trace.push(state);
            }
            return trace;
        }, (s, i) => `<div class="lab-split"><div class="viz">${placementSVG(s.pos, { candidate: i && !s.accepted ? s.candidate : null, edges: [[4, 0], [0, 1], [1, 2], [1, 3], [2, 3], [3, 5]] })}</div><div class="insight"><div class="metrics">${metric('当前总成本', fmt(s.energy.value))}${metric('线长部分', fmt(s.energy.wire))}${metric('重叠惩罚前的 ΣO²', fmt(s.energy.overlap))}${metric('当前温度', fmt(s.temperature))}</div>${i ? `<div class="state-code">${esc(s.move)}\nΔC = ${fmt(s.delta, 5)}\np = ${fmt(s.prob, 5)}\nu = ${fmt(s.u, 5)}\n接受：${s.accepted ? '是' : '否'}</div>` : '<p>尚未生成候选；点击下一步提出一次可重复的移动。</p>'}</div></div>${status(i ? (s.accepted ? `接受候选：${s.delta > 0 ? '这是一次概率接受的坏解。' : '候选成本没有上升。'}` : '拒绝候选：橙色虚框是尝试过、没有采纳的位置。') : '在同一状态回退后重走，候选与随机数完全相同。', i && !s.accepted ? 'warn' : '')}`, { note: '四矩形教学模型，仅移动/交换；不实现行长平衡、旋转或完整合法化。图中细线仅示意连接，成本按超边 HPWL 实算。' });
    }
    function partitionSVG(assign, cost) {
        const counts = [0, 0], coords = assign.map(a => [a ? 365 : 145, 45 + counts[a]++ * 43]);
        let s = `<rect x="35" y="18" width="200" height="285" rx="8" class="node-bg"/><rect x="275" y="18" width="200" height="285" rx="8" class="node-bg"/>`;
        E.partitionNets.forEach((net, k) => { const center = [E.sum(net.map(i => coords[i][0])) / net.length, E.sum(net.map(i => coords[i][1])) / net.length]; for (const i of net)
            s += line(...coords[i], ...center, cost.cuts[k] ? 'orange-edge' : 'edge', `opacity="${cost.cuts[k] ? .6 : .3}" stroke-width="1.6"`); });
        coords.forEach((p, i) => { s += circle(...p, 15, 'active-point', `data-node="${i}" style="cursor:pointer"`) + text(p[0], p[1] + 4, String.fromCharCode(65 + i), 'label', 'middle', 'pointer-events="none"'); });
        s += text(135, 328, '分区 0', 'label') + text(375, 328, '分区 1', 'label');
        return svg(s, 510, 345, '六单元分区；跨区超边用橙色标示');
    }
    function initPartition() {
        const api = player('partition', slider('part-tol', '允许面积不平衡 |L−R| / 6', 0, 1, 1 / 3, 0), () => { const p = E.partitionEnumerate(val('part-tol')); return { ...p, trace: p.states }; }, (s, i, t, r) => `<div class="lab-split"><div class="viz">${partitionSVG(s.assign, s)}</div><div class="insight"><div class="metrics">${metric('左右单元数', s.left + ' / ' + s.right)}${metric('cut net 数', s.cut, '每条超边至多计 1')}${metric('本次是否平衡', s.balanced ? '是' : '否', '', s.balanced ? 'good' : 'bad')}${metric('全枚举最小合法 cut', r.best.cut, '由 64 个赋值求出')}</div><div>${s.assign.map((a, k) => `<button data-flip="${k}" aria-label="切换单元 ${String.fromCharCode(65 + k)} 分区">${String.fromCharCode(65 + k)} → ${1 - a}</button>`).join(' ')}</div><p class="lab-note">跨区的网：${s.cuts.map((c, k) => c ? 'e' + k : null).filter(Boolean).join(', ') || '无'}</p><button data-best="${r.best.mask}">跳到一个最优合法划分</button></div></div>${status(s.balanced ? '符合当前平衡约束，再比较 cut。' : 'cut 小并不代表合法；当前分区违反容量平衡约束。', s.balanced ? '' : 'warn')}`, { note: '每个单元面积相同；只枚举这一层二分，不冒充多级 FM 或全局布局器。点击单元或按钮可直接改变赋值。' });
        api.el.addEventListener('click', e => { const b = e.target.closest('[data-flip],[data-node],[data-best]'); if (!b)
            return; if (b.hasAttribute('data-best'))
            api.setCursor(+b.dataset.best);
        else {
            const k = +(b.dataset.flip ?? b.dataset.node), a = api.getState().assign;
            a[k] ^= 1;
            api.setCursor(a.reduce((x, y) => x * 2 + y, 0));
        } });
    }
    function initOptimizer() {
        player('optimizer', select('opt-mode', '目标函数', [['quadratic', '平方距离（线性方程解作对照）'], ['nonlinear', 'LSE + 高斯排斥（教学模型）']], 'quadratic') + select('opt-case', '初始状态', [['spread', '非对称分散'], ['cluster', '轻微偏离的拥挤状态'], ['symmetric', '完全对称且重合']], 'spread') + slider('opt-lambda', '排斥权重 λ（非线性模式）', 0, 12, .25, 5) + slider('opt-tau', 'LSE 平滑尺度 τ', .1, 2, .05, .6), () => { const options = { mode: str('opt-mode'), lambda: val('opt-lambda'), tau: val('opt-tau') }, pos = str('opt-case') === 'spread' ? [[1, 2], [3, 8], [7, 2], [9, 8]] : str('opt-case') === 'symmetric' ? Array.from({ length: 4 }, () => [5, 5]) : [[4.5, 4.6], [4.8, 5.4], [5.3, 4.7], [5.6, 5.3]]; let s = { pos, iteration: 0, eta: 0, ...E.optEnergy(pos, options.mode, options.lambda, options.tau) }; const trace = [s]; for (let k = 0; k < 80; k++) {
            s = E.optStep(s, options);
            trace.push(s);
        } return { trace, options, exact: E.quadraticSolution() }; }, (s, i, t, r) => { const err = E.gradientError(s.pos, r.options.mode, r.options.lambda, r.options.tau), res = r.options.mode === 'quadratic' ? Math.max(...s.pos.flat().map(x => Math.abs(x - 5))) : null; return `<div class="lab-split"><div class="viz">${placementSVG(s.pos, { trace: t.slice(0, i + 1), edges: E.optEdges(), rects: false })}</div><div class="insight"><div class="metrics">${metric('总目标 C', fmt(s.value, 5))}${metric('梯度范数', fmt(s.norm, 5))}${metric('线长型目标 W', fmt(s.wire, 4))}${metric('排斥势 D', fmt(s.density, 4))}</div><div class="state-code">迭代 k=${i}\n实际步长 η=${fmt(s.eta, 6)}\n梯度有限差分误差=${err.toExponential(2)}${res !== null ? '\n离解析解的最大坐标误差=' + fmt(res, 6) : '\n目标含非凸排斥，不保证全局最优'}</div></div></div>${status(r.options.mode === 'quadratic' ? '这个教学连接图的解析解为所有单元 x=y=5：线长最优不等于合法。' : '本实现投影至 [0.5,9.5]²，并用回溯线搜索保证不增大当前目标；排斥势不是 ePlace 静电密度。', 'neutral')}${str('opt-case') === 'symmetric' ? status('完全对称位置的排斥梯度可恰好为零。增大 λ 也不会凭空产生打破对称的方向。', 'warn') : ''}`; }, { note: '投影梯度下降 + Armijo 型回溯。平方距离模式忽略 λ、τ；改变模型或参数会重置迭代。图中细尾迹来自实际历史坐标。' });
    }
    function initVectors() {
        const el = $('#lab-vectors .lab-ui');
        el.innerHTML = `<div class="controls">${slider('vec-w', '矩形宽 w', .25, 4, .05, 1)}${slider('vec-h', '矩形高 h', .25, 4, .05, 1)}</div><div class="lab-display"></div>`;
        function render() {
            updateValues(el);
            const w = val('vec-w'), h = val('vec-h'), a = 2 * w + h, b = w + 2 * h, st = E.steiner([[0, 0], [w, 0], [0, h], [w, h]]);
            let s = '';
            const scale = 58;
            for (let k = 0; k < 2; k++) {
                const x = 40 + k * 280, y = 30, W = w * scale, H = h * scale;
                const pts = k ? [[x, y], [x + W, y], [x + W, y + H], [x, y + H]] : [[x, y], [x, y + H], [x + W, y + H], [x + W, y]];
                s += path(pts, (k ? a <= b : b <= a) ? 'accent-edge' : 'orange-edge');
                for (const [p, q] of [[x, y], [x + W, y], [x, y + H], [x + W, y + H]])
                    s += circle(p, q, 5, 'pin');
                s += text(x + 115, 292, `${k ? '2w + h' : 'w + 2h'} = ${fmt(k ? a : b)}`, 'label');
            }
            const xs = E.range(61).map(i => .25 + i * 3.75 / 60);
            $('.lab-display', el).innerHTML = `<div class="viz">${svg(s, 560, 317, '矩形四角的两种候选最短直角树')}</div><div class="metrics">${metric('候选 A：w + 2h', fmt(b))}${metric('候选 B：2w + h', fmt(a))}${metric('当前最小候选', fmt(Math.min(a, b)))}${metric('独立 Hanan DP 残差', fmt(Math.abs(st.length - Math.min(a, b)), 10))}</div>${plot([{ points: xs.map(x => [x, x + 2 * h]) }, { points: xs.map(x => [x, 2 * x + h]) }], { xmin: .25, xmax: 4, ymin: 0, ymax: Math.max(4 + 2 * h, 8 + h) * 1.05, xticks: [1, 2, 3, 4], yticks: [0, 4, 8, 12].filter(y => y <= Math.max(4 + 2 * h, 8 + h)), point: [w, Math.min(a, b)], xlabel: '宽 w（固定当前 h）', ylabel: '候选线长' })}${status('相对坐标顺序相同，不意味着长度表达式的赢家相同；本例在 w=h 处切换。这里只演示候选长度向量，不调用或冒充 FLUTE。', 'neutral')}`;
            labs.vectors.state = { w, h, a, b, exact: st.length };
        }
        labs.vectors = { el, getState: () => E.clone(labs.vectors.state), render };
        el.addEventListener('input', render);
        render();
    }
    function initLee() {
        let config = E.gridCase();
        const api = player('lee', select('lee-case', '网格预设', [['source', '原例统一为 5×5'], ['maze', '有绕行的 9×7'], ['sealed', '封闭终点：无解']], 'source') + select('lee-code', '距离标签显示', [['full', '完整 BFS 距离'], ['mod3', '模 3：0→1→2'], ['pair', '成对循环：0→0→1→1'], ['parity', '仅奇偶：反例观察']], 'full') + '<button type="button" id="lee-swap">交换起终点</button>', () => ({ ...E.lee(config), config: E.clone(config) }), (s, i, t, r) => {
            const mode = str('lee-code'), blocked = new Set(config.blocked), q = new Set(s.queue), p = new Set(s.path), labels = s.dist.map(d => E.codeDistance(d, mode));
            let compressed = null, compressedOK = null;
            if (s.dist[config.target] >= 0 && ['mod3', 'pair'].includes(mode)) {
                compressed = E.retraceCodes(config, labels, s.dist[config.target] % (mode === 'mod3' ? 3 : 4), mode);
                compressedOK = compressed.length - 1 === s.dist[config.target];
            }
            const cells = labels.map((d, k) => { const end = k === config.start ? 'S' : k === config.target ? 'T' : '', cl = blocked.has(k) ? 'blocked' : p.has(k) ? 'route' : k === s.current ? 'current' : q.has(k) ? 'queued' : d >= 0 ? 'visited' : ''; return `<button type="button" class="maze-cell ${cl} ${end ? 'endpoint' : ''}" data-cell="${k}" aria-label="坐标 ${k % config.w},${Math.floor(k / config.w)}：${blocked.has(k) ? '障碍' : end ? end + ' 标签 ' + d : d < 0 ? '未访问' : '标签 ' + d}" ${end ? 'disabled' : ''}>${blocked.has(k) ? '■' : end ? end + (d >= 0 ? `<small>${d}</small>` : '') : d < 0 ? '·' : d}</button>`; }).join('');
            return `<div class="lab-split"><div><div class="maze-grid" style="grid-template-columns:repeat(${config.w},1fr)">${cells}</div><p class="lab-note">上方 y=0；x 向右、y 向下。点击空白或障碍格编辑；S/T 不可堵塞。</p></div><div class="insight"><div class="metrics">${metric('已扩展节点', s.expanded)}${metric('队列长度', s.queue.length)}${metric('已知终点距离', s.dist[config.target] < 0 ? '未知' : s.dist[config.target])}${metric('当前回溯边数', Math.max(0, s.path.length - 1))}</div><div class="state-code">阶段：${s.phase}\n队列（格编号）：${s.queue.join(', ') || '空'}\n${esc(s.message)}</div>${compressed ? status(`独立压缩回溯长度 ${compressed.length - 1}；与 BFS 终点距离${compressedOK ? '一致' : '不一致'}。`, compressedOK ? '' : 'warn') : ''}</div></div>${status(mode === 'parity' ? '仅 0/1 交替不能区分 d−1 和 d+1 邻格。图中路径仍由完整 BFS 参考路径给出，不能声称由奇偶标签恢复。' : mode === 'full' ? '每一步出队一个节点；发现终点后按前驱逐边回退。' : '压缩回溯只读压缩标签、当前相位、障碍/访问标记；完整距离另保留作独立核验。浏览器未实际采用紧凑位存储。', mode === 'parity' ? 'warn' : 'neutral')}`;
        }, { bind: false, note: '只支持四邻接、单位边权。回退恢复完整搜索快照；改障碍后重新求解。压缩显示不改变搜索顺序。' });
        api.el.addEventListener('input', e => { if (e.target.id === 'lee-case') {
            config = E.gridCase(str('lee-case'));
            api.rebuild();
        }
        else if (e.target.id === 'lee-code')
            api.render(); });
        api.el.addEventListener('click', e => { const b = e.target.closest('[data-cell]'); if (b && !b.disabled) {
            const k = +b.dataset.cell, at = config.blocked.indexOf(k);
            if (at >= 0)
                config.blocked.splice(at, 1);
            else
                config.blocked.push(k);
            api.rebuild();
        } if (e.target.id === 'lee-swap') {
            [config.start, config.target] = [config.target, config.start];
            api.rebuild();
        } });
    }
    function timingDrawing(graph, s, critical, done) {
        const positions = graph.names.length === 5 ? [[35, 145], [165, 55], [165, 240], [335, 145], [485, 145]] : [[35, 145], [170, 60], [170, 250], [330, 215], [330, 50], [490, 145]];
        let body = '';
        for (const e of graph.edges) {
            const a = positions[e.u], b = positions[e.v], crit = done && critical.some((x, i) => x === e.u && critical[i + 1] === e.v);
            body += line(...a, ...b, crit ? 'orange-edge' : 'edge', 'marker-end="url(#sta-arrow)"') + text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 9, `${fmt(e.min, 2)} / ${fmt(e.max, 2)}`, 'small-label');
        }
        for (let i = 0; i < positions.length; i++) {
            const [x, y] = positions[i];
            body += circle(x, y, 20, i === s.u ? 'active-point' : 'point') + text(x, y + 5, graph.names[i], 'label') + text(x, y + 38, `${fmt(s.early[i])} | ${fmt(s.late[i])}`, 'small-label') + text(x, y + 54, `R ${fmt(s.required[i])}`, 'small-label');
        }
        return svg('<defs><marker id="sta-arrow" markerWidth="6" markerHeight="6" refX="19" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="var(--muted)"/></marker></defs>' + body, 530, 327, '时序 DAG：弧 min / max 延迟，节点 early | late 与 setup required');
    }
    function initSTA() { player('sta', select('sta-case', '时序图', [['diamond', '双路径汇合'], ['branch', '两次分支 / 汇合']], 'diamond') + slider('sta-period', '时钟周期 T', .4, 2.5, .025, 1.2, ' ns') + slider('sta-skew', 'capture − launch 时钟偏斜', -.3, .3, .01, 0, ' ns') + slider('sta-scale', '组合弧延迟倍率', .3, 2, .05, 1) + slider('sta-hold', 'hold 要求', 0, .4, .01, .15, ' ns'), () => { const graph = E.timingCase(str('sta-case'), val('sta-scale')), options = { T: val('sta-period'), skew: val('sta-skew'), setup: .1, hold: val('sta-hold'), qmin: .04, qmax: .08 }; return { ...E.sta(graph, options), graph, options }; }, (s, i, t, r) => { const end = r.endpoints[0], have = s.late[end] !== null, req = s.required[end], ss = have && req !== null ? req - s.late[end] : null, hs = s.early[end] !== null ? s.early[end] - r.options.skew - r.options.hold : null; return `<div class="viz">${timingDrawing(r.graph, s, r.critical, s.phase === 'done')}</div><div class="metrics">${metric('终点 late AT', fmt(s.late[end]), 'ns')}${metric('终点 setup RAT', fmt(req), 'ns')}${metric('setup slack', fmt(ss), 'ns', ss !== null ? (ss < 0 ? 'bad' : 'good') : '')}${metric('hold slack', fmt(hs), 'ns', hs !== null ? (hs < 0 ? 'bad' : 'good') : '')}</div>${table(['节点', 'early AT', 'late AT', 'setup RAT'], r.graph.names.map((n, k) => row([n, fmt(s.early[k]), fmt(s.late[k]), fmt(s.required[k])], k === s.u ? 'selected-row' : '')))}${status(s.message)}<p class="lab-note">弧标注为 min/max，单位 ns；源寄存器 clk→Q 为 0.04/0.08 ns，setup=0.10 ns。${s.phase === 'done' ? '橙色路径为当前最差 setup 路径。' : ''}</p>`; }, { note: '单时钟域标量 DAG 模型；不含 slew/负载依赖、OCV、重汇合时钟悲观消除、SI 或例外路径。先前向传播，再反向传播；结果不预填到尚未执行的节点。' }); }
    function barComparison(values, labels, { unit = '', width = 540, height = 155 } = {}) { const max = Math.max(...values, 1e-12), step = (height - 35) / values.length; let s = ''; values.forEach((v, i) => { const y = 15 + i * step; s += text(6, y + 19, labels[i], 'label', 'start') + `<rect x="128" y="${y}" width="${Math.max(1, v / max * (width - 235))}" height="25" rx="3" fill="${i ? 'var(--orange)' : 'var(--accent)'}" opacity=".8"/>` + text(134 + v / max * (width - 235), y + 18, `${fmt(v, 4)} ${unit}`, 'small-label', 'start'); }); return svg(s, width, height, '根据公式计算的时间分量比较'); }
    function initCPU() {
        const el = $('#lab-cpu .lab-ui');
        el.innerHTML = `<div class="controls">${select('cpu-case', '情景', [['base', '基线'], ['clock', '时钟变快但 CPI 上升'], ['ic', '指令数减半']], 'base')}${slider('cpu-ic', '指令数 / 10⁶', .5, 2, .05, 1)}${slider('cpu-cpi', 'CPI', .5, 5, .1, 1)}${slider('cpu-clock', '周期长度', .25, 3, .05, 1, ' ns')}</div><div class="lab-display"></div>`;
        function render() { updateValues(el); const IC = val('cpu-ic') * 1e6, CPI = val('cpu-cpi'), clock = val('cpu-clock'), time = E.cpuTime(IC, CPI, clock), base = E.cpuTime(1e6, 1, 1); $('.lab-display', el).innerHTML = `<div class="metrics">${metric('运行时间', fmt(time * 1e3), 'ms')}${metric('相对基线加速比', fmt(base / time) + '×')}${metric('时钟频率', fmt(1 / clock), 'GHz')}${metric('总时钟周期', fmt(IC * CPI / 1e6), '百万周期')}</div>${barComparison([base * 1e3, time * 1e3], ['固定基线', '当前参数'], { unit: 'ms' })}${status(`${fmt(IC / 1e6)}×10⁶ instructions × ${fmt(CPI)} cycles/instruction × ${fmt(clock)} ns/cycle = ${fmt(time * 1e3)} ms。`)}<p class="lab-note">基线固定为 10⁶ 条指令、CPI=1、周期=1 ns。这里允许分别改变三个因素作因果辨析，不代表同一处理器上的任意参数组合都可实现。</p>`; labs.cpu.state = { IC, CPI, clock, time, speedup: base / time }; }
        labs.cpu = { el, getState: () => E.clone(labs.cpu.state), render };
        el.addEventListener('input', e => { if (e.target.id === 'cpu-case') {
            const p = str('cpu-case') === 'clock' ? [1, 3, .5] : str('cpu-case') === 'ic' ? [.5, 1, 1] : [1, 1, 1];
            ['cpu-ic', 'cpu-cpi', 'cpu-clock'].forEach((id, i) => $('#' + id).value = p[i]);
        } render(); });
        render();
    }
    function initPipeline() {
        player('pipeline', select('pipe-case', '程序', [['independent', '独立指令'], ['dependent', 'RAW 依赖链'], ['load', 'load-use + 存储'], ['branch', 'EX 判定的条件分支']], 'dependent') + checkbox('pipe-forward', '开启 EX/MEM、MEM/WB 转发', true) + checkbox('pipe-unified', '单端口统一指令 / 数据存储器', false), () => { const program = E.pipelineProgram(str('pipe-case')), options = { forward: checked('pipe-forward'), unified: checked('pipe-unified') }; return { ...E.runPipeline(program, options), program, options, reference: E.sequential(program) }; }, (s, i, t, r) => {
            const stage = ['IF', 'ID', 'EX', 'MEM', 'WB'], seen = new Map();
            for (const h of s.history)
                for (const x of h.occupancy)
                    if (x)
                        seen.set(x.uid, x);
            for (const x of s.stages)
                if (x)
                    seen.set(x.uid, x);
            const inst = [...seen.values()].sort((a, b) => a.uid - b.uid), complete = i === t.length - 1, correct = complete && JSON.stringify(s.regs) === JSON.stringify(r.reference.regs) && JSON.stringify(s.memory) === JSON.stringify(r.reference.memory);
            const chart = table(['指令实例', ...s.history.map(h => h.cycle)], inst.map(x => row([`#${x.uid} @${x.pc} ${esc(E.instructionText(r.program[x.pc]))}`, ...s.history.map(h => { const at = h.occupancy.findIndex(p => p?.uid === x.uid); return at < 0 ? '' : `<span class="stage-tag ${stage[at].toLowerCase()}" title="周期 ${h.cycle}${h.branch ? '：EX 分支判定' : ''}">${stage[at]}${h.stalled && at < 2 ? ' ·' : ''}${h.branch && at < 2 ? ' ×' : ''}</span>`; })])), 'pipeline-chart');
            return `<div class="pipeline-stages">${stage.map((name, k) => `<div class="pipeline-stage"><b>${name}</b><span>${s.stages[k] ? `@${s.stages[k].pc}<br>${esc(E.instructionText(s.stages[k]))}` : '气泡 / 空'}</span></div>`).join('')}</div><p class="lab-note">上方为周期边界后的阶段状态；下方横表记录每个已执行周期中的占用。· = 停顿保留；× = 被冲刷。</p><div class="metrics">${metric('已执行周期', s.cycle)}${metric('已退休指令', s.retired.length)}${metric('停顿事件', s.stalls)}${metric('冲刷指令', s.flushes)}</div>${chart}<div class="registers">${s.regs.map((v, k) => `<span>r${k}<b>${v}</b></span>`).join('')}</div><div class="state-code">mem[0]=${s.memory[0]}，mem[4]=${s.memory[4]}\n${esc(s.message)}</div>${complete ? status(correct ? '已与独立的非流水顺序解释器比较：寄存器及内存结果一致。' : '顺序解释器对照失败。', correct ? '' : 'warn') : status('尚未完成；中间寄存器值不应与最终答案直接比较。', 'neutral')}<details><summary>查看输入指令与模型边界</summary>${table(['PC', '指令'], r.program.map((p, k) => row([k, esc(E.instructionText(p))])))}<p>单发射五级；每条指令均占用 IF/ID/EX/MEM/WB。WB 写在 ID 读之前。EX 分支预测不跳转，成立则冲刷 IF/ID；访存延迟固定一周期。不模拟 cache miss、乱序执行或真实 ISA 的异常。</p></details>`;
        }, { note: '每次前进一个时钟周期，回退恢复寄存器、内存、动态指令实例、停顿和冲刷历史。无依赖 n 条指令完成时间为 n+4 周期。流水线原 PPT 未取得，此模型明确为补充。' });
    }
    const cacheCases = { sequential: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 4, 5], conflict: [0, 16, 0, 16, 0, 16, 0, 16], reuse: [0, 8, 0, 16, 8, 0, 16, 8, 0] };
    function initCache() {
        const controls = select('cache-case', '地址序列', [['sequential', '空间局部性'], ['conflict', '同组冲突'], ['reuse', 'LRU 复用次序']], 'sequential') + select('cache-sets', '组数 S', [['1', '1'], ['2', '2'], ['4', '4'], ['8', '8']], '4') + select('cache-ways', '每组路数 W', [['1', '1（直接映射）'], ['2', '2'], ['4', '4']], '1') + select('cache-block', '块字节数 B', [['4', '4 B'], ['8', '8 B'], ['16', '16 B']], '4') + `<div class="control wide-control"><label for="cache-addresses">字节地址（十进制整数，以逗号或空格分隔，最多 128 个）</label><textarea id="cache-addresses" rows="2" data-param>${cacheCases.sequential.join(', ')}</textarea></div>`;
        /* Physical address -> (tag, set, offset) encoding, and which blocks share one set. */
        function cacheMapFigure(r, s) { const o = r.options, step = s.index >= 0 ? s : null, addr = step ? step.address : (r.addresses[0] ?? 0);
            const offsetBits = Math.max(1, Math.round(Math.log2(o.block))), setBits = Math.max(0, Math.round(Math.log2(o.sets))), tagBits = Math.max(1, addr.toString(2).length - offsetBits - setBits), digits = addr.toString(2).padStart(tagBits + setBits + offsetBits, '0'), pitch = 30, cell = 26, x0 = 16, y0 = 30;
            const groups = [['tag', tagBits, 'var(--accent-soft)'], ['set', setBits, 'var(--orange-soft)'], ['offset', offsetBits, 'var(--panel)']];
            let inner = '', x = x0, read = 0;
            for (const [name, n, fill] of groups) { const part = digits.slice(read, read + n);
                read += n;
                if (!n)
                    continue;
                const w = n * pitch - 4;
                inner += `<rect x="${x}" y="${y0}" width="${w}" height="${cell + 8}" rx="4" fill="${fill}" stroke="var(--line)"/>`;
                for (let b = 0; b < n; b++)
                    inner += text(x + b * pitch + cell / 2, y0 + cell - 1, part[b], 'small-label');
                if (w >= 24)
                    inner += text(x + w / 2, y0 - 8, name, 'small-label');
                x += w + 8; }
            inner += text(x + 8, y0 + cell / 2 + 4, `← 字节地址 ${addr}`, 'label', 'start');
            const rowH = 28, top = y0 + cell + 34, chipW = 68, chipPitch = 74, chipX = x0 + 72;
            for (let k = 0; k < o.sets; k++) { const yy = top + k * rowH, on = step && step.set === k;
                if (on)
                    inner += `<rect x="${x0 - 4}" y="${yy - 16}" width="528" height="${rowH - 6}" rx="4" fill="var(--accent-soft)" opacity=".6"/>`;
                inner += text(x0, yy + 1, 'set ' + k, 'label', 'start');
                for (let j = 0; j < 3; j++) { const b = k + j * o.sets, bx = chipX + j * chipPitch, active = step && step.blockNumber === b;
                    inner += `<rect x="${bx}" y="${yy - 15}" width="${chipW}" height="22" rx="3" fill="${active ? 'var(--accent)' : 'var(--paper)'}" stroke="${active ? 'var(--accent)' : 'var(--line)'}"/>` + text(bx + chipW / 2, yy + 1, '块 ' + b, 'small-label', 'middle', active ? 'fill="#fff"' : ''); }
                inner += text(chipX + 3 * chipPitch + 4, yy + 1, `… 只留 ${o.ways} 路`, 'small-label', 'start'); }
            return svg(inner, 560, top + o.sets * rowH + 8, '物理地址如何拆成 tag、set、offset，以及哪些块映射到同一个 set'); }
        const api = player('cache', controls, () => { const raw = str('cache-addresses').trim(), addresses = raw ? raw.split(/[\s,，]+/).map(x => /^\d+$/.test(x) ? Number(x) : NaN) : []; if (addresses.length > 128)
            throw new Error('地址序列超过 128 项'); const options = { sets: val('cache-sets'), ways: val('cache-ways'), block: val('cache-block') }; return { ...E.cacheTrace(addresses, options), options, addresses }; }, (s, i, t, r) => {
            const grid = table(['组', ...E.range(r.options.ways).map(w => 'way ' + w)], s.lines.map((set, k) => row([k, ...set.map((x, w) => x ? `<div class="cache-line ${s.set === k && s.way === w ? 'active' : ''}"><b>tag ${x.tag}</b><small>block ${x.block} · 最近访问 #${x.used + 1}</small></div>` : '<span class="muted">invalid</span>')], s.set === k ? 'selected-row' : '')));
            const shown = s.index >= 0 ? s.address : (r.addresses[0] ?? 0), blockOf = Math.floor(shown / r.options.block), encBits = { off: Math.round(Math.log2(r.options.block)), set: Math.max(0, Math.round(Math.log2(r.options.sets))) };
            const enc = `${cacheMapFigure(r, s)}<p class="lab-note">${s.index >= 0 ? '当前地址' : '首个地址'} ${shown} 的编码：b=⌊${shown}/${r.options.block}⌋=${blockOf}，set=b mod ${r.options.sets}=${blockOf % r.options.sets}，tag=⌊b/${r.options.sets}⌋=${Math.floor(blockOf / r.options.sets)}，offset=${shown} mod ${r.options.block}=${shown % r.options.block}。这里 B 与 S 都是 2 的幂，所以等价于地址位切片：低 ${encBits.off} 位是块内偏移，接着 ${encBits.set} 位选 set，其余高位是 tag。图中每行列出会落入同一个 set 的块（它们相差 S 个块），而该 set 只有 ${r.options.ways} 路，装不下的就会被替换。</p>`;
            return `<div class="metrics">${metric('已处理访问', i)}${metric('命中 / 未命中', s.hits + ' / ' + s.misses)}${metric('当前未命中率', i ? fmt(s.misses / i * 100, 1) + '%' : '—')}${metric('数据容量', r.options.sets * r.options.ways * r.options.block, 'bytes（不含元数据）')}</div>${enc}${grid}${s.index >= 0 ? `<div class="address-fields"><span>地址 <b>${s.address}</b></span><span>block <b>${s.blockNumber}</b></span><span>tag <b>${s.tag}</b></span><span>set <b>${s.set}</b></span><span>offset <b>${s.offset}</b></span></div>` : ''}${status(s.index >= 0 ? (s.hit ? 'HIT · ' : 'MISS · ') + s.message : s.message, s.index >= 0 && !s.hit ? 'warn' : '')}<div class="address-stream">${r.addresses.map((a, k) => `<button data-address-step="${k + 1}" class="${k === s.index ? 'active' : ''}" aria-label="跳转到第 ${k + 1} 次访问，地址 ${a}">${a}</button>`).join('')}</div><p class="lab-note">这是冷启动、按读取访问分配的组相联 LRU 缓存。增加路数而不减少组数也会增加容量；讨论相联度时应控制总容量。LRU 按最近访问时间戳选择，不用随机替换。</p>`;
        }, { bind: false, note: '回退恢复所有缓存行、valid/tag 与最近访问时间；空地址序列合法。无效输入会明确报错，并保留上一次有效状态。' });
        api.el.addEventListener('input', e => { if (e.target.id === 'cache-case')
            $('#cache-addresses').value = cacheCases[str('cache-case')].join(', '); if (e.target.matches('[data-param]'))
            api.rebuild(); });
        api.el.addEventListener('click', e => { const b = e.target.closest('[data-address-step]'); if (b)
            api.setCursor(+b.dataset.addressStep); });
    }
    function initMemory() {
        const el = $('#lab-memory .lab-ui');
        el.innerHTML = `<div class="controls">${slider('mem-ideal', '理想 CPI', .5, 3, .1, 1)}${slider('mem-access', '每条指令访问次数', 0, 2, .05, .4)}${slider('mem-miss', '未命中率 m', 0, 1, .01, .1)}${slider('mem-penalty', '一次未命中罚时', 0, 250, 5, 100, ' cycles')}<button type="button" id="mem-import">采用上方完整地址流的实算未命中率</button></div><div class="lab-display"></div>`;
        let imported = null;
        function render() { updateValues(el); const options = { IC: 1e6, clock: 1, ideal: val('mem-ideal'), access: val('mem-access'), miss: val('mem-miss'), penalty: val('mem-penalty') }, r = E.memoryPerf(options), idealTime = E.cpuTime(options.IC, options.ideal, options.clock); $('.lab-display', el).innerHTML = `<div class="metrics">${metric('stall CPI', fmt(r.stall), 'cycles / instruction')}${metric('总 CPI', fmt(r.cpi))}${metric('10⁶ 条指令耗时', fmt(r.seconds * 1e3), 'ms，时钟周期 1 ns')}${metric('相对理想时间', fmt(r.seconds / idealTime) + '×')}</div>${barComparison([options.ideal, r.stall], ['计算周期 / 指令', '访存停顿 / 指令'], { unit: 'cycles' })}${status(`${fmt(options.access)} accesses/instruction × ${fmt(options.miss)} misses/access × ${fmt(options.penalty)} cycles/miss = ${fmt(r.stall)} cycles/instruction。`)}${imported !== null ? `<p class="lab-note">导入时的完整地址流未命中率为 ${(imported * 100).toFixed(4)}%；当前公式使用 m=${options.miss}。这是教学地址流，不是芯片 benchmark。</p>` : ''}<p class="lab-note">串行阻塞假设：所有 miss 罚时相加且不能与计算重叠。不适用于直接预测非阻塞 cache、内存级并行、预取或乱序核实测性能。</p>`; labs.memory.state = { options, ...r }; }
        labs.memory = { el, getState: () => E.clone(labs.memory.state), render };
        el.addEventListener('input', () => { imported = null; render(); });
        $('#mem-import').addEventListener('click', () => { const r = labs.cache.getResult(); imported = r.missRate; $('#mem-miss').step = 'any'; $('#mem-miss').value = imported; render(); });
        render();
    }
    function initAmdahl() {
        const el = $('#lab-amdahl .lab-ui');
        el.innerHTML = `<div class="controls">${slider('amd-p', '可并行比例 P', 0, 100, 1, 90, '%')}${slider('amd-n', '处理器数量 N', 1, 128, 1, 10)}${slider('amd-h', '额外开销比例 h', 0, 30, 1, 0, '%')}${select('amd-mode', '开销的分母', [['parallel', '以缩短后的并行时间为基准 hP/N'], ['baseline', '以原并行时间为基准 hP']], 'parallel')}</div><div class="lab-display"></div>`;
        function render() { updateValues(el); const P = val('amd-p') / 100, N = val('amd-n'), h = val('amd-h') / 100, mode = str('amd-mode'), r = E.amdahl(P, N, h, mode), points = E.range(128).map(i => [Math.log2(i + 1), E.amdahl(P, i + 1, h, mode).speedup]), max = Math.max(1, ...points.map(p => p[1])) * 1.08; $('.lab-display', el).innerHTML = `<div class="metrics">${metric('加速比 S', fmt(r.speedup, 4) + '×')}${metric('并行效率 S/N', fmt(r.efficiency * 100, 2) + '%')}${metric('N→∞ 的上界', fmt(r.limit, 3))}${metric('归一化运行时间', fmt(r.time, 5), '原单核时间 = 1')}</div>${plot([{ points }], { xmin: 0, xmax: 7, ymin: 0, ymax: max, xticks: [1, 2, 4, 8, 16, 32, 64, 128].map(n => [Math.log2(n), n]), yticks: [0, max / 4, max / 2, 3 * max / 4, max], point: [Math.log2(N), r.speedup], xlabel: 'N（横轴 log₂）', ylabel: '加速比 S', asymptote: r.limit })}<div class="time-strip" aria-label="串行、并行、额外开销分量">${[['串行', r.serial, 'var(--orange)'], ['并行', r.parallel, 'var(--accent)'], ['额外', r.overhead, 'var(--muted)']].filter(x => x[1] > 0).map(([l, v, c]) => `<span style="flex:${v};background:${c}" title="${l} ${fmt(v, 6)}">${l}</span>`).join('')}</div><div class="state-code">T/T₁ = ${fmt(r.serial)} + ${fmt(r.parallel, 5)} + ${fmt(r.overhead, 5)} = ${fmt(r.time, 5)}\n在 h=0 的单独假设下，达到 5× 需要 N≥${fmt(E.minProcessors(P, 5))}</div>${status('固定总工作量的强扩展模型。曲线只反映输入 P 与所选开销公式，不是多核 CPU 或 GPU 的实测扩展曲线。', 'neutral')}`; labs.amdahl.state = { P, N, h, mode, ...r }; }
        labs.amdahl = { el, getState: () => E.clone(labs.amdahl.state), render };
        el.addEventListener('input', render);
        render();
    }
    function initLocks() {
        const el = $('#lab-locks .lab-ui');
        el.innerHTML = `<div class="controls">${select('lock-case', '互斥算法', [['peterson', 'Peterson'], ['lockone', 'LockOne'], ['locktwo', 'LockTwo'], ['unsafe', '先检查再置位（不安全）']], 'peterson')}${select('lock-active', '参与线程', [['both', '两个线程都申请'], ['single', '只有 T0 申请']], 'both')}<button id="lock-example" type="button">加载有代表性的交错</button></div><div class="lab-display"></div><div class="stepper"><button data-lock="back">← 回退</button><button data-thread="0" class="primary">执行 T0 一步</button><button data-thread="1" class="primary">执行 T1 一步</button><button data-lock="next">按当前交错重做 →</button><button data-lock="reset">重置</button><span class="counter"></span></div><p class="lab-note">每线程只申请一次；两个共享变量的读取是两步，不把 while 条件偷偷当作原子复合操作。回退后改选线程会截断旧的未来分支。</p>`;
        let trace = [], cursor = 0, checkResult = null;
        const statusName = { violation: '互斥违例：两线程同时在临界区', done: '两次申请均已结束', deadlock: '已进入该模型的永久等待状态', critical: '一个线程位于临界区', running: '尚未进入临界区 / 正在竞争' };
        const pcs = { peterson: ['flag[i] = true', 'victim = i', '读取 flag[j]', '读取 victim 并判定', '执行临界区', 'flag[i] = false', '本次结束'], lockone: ['flag[i] = true', '—', '读取 flag[j]，为真则等', '—', '执行临界区', 'flag[i] = false', '本次结束'], locktwo: ['victim = i', '—', '—', '读取 victim，等到不等于 i', '执行临界区', '释放（无操作）', '本次结束'], unsafe: ['检查 flag[j]', 'flag[i] = true; 进入', '—', '—', '执行临界区', 'flag[i] = false', '本次结束'] };
        function rebuild() { const algorithm = str('lock-case'), active = str('lock-active') === 'both' ? [true, true] : [true, false]; trace = [E.lockInitial(algorithm, active)]; cursor = 0; checkResult = E.lockExplore(algorithm, active); paint(); }
        function paint() {
            const s = trace[cursor], st = E.lockStatus(s);
            $('.lab-display', el).innerHTML = `<div class="metrics">${metric('共享 flag', s.flag.map(Number).join(' , '))}${metric('共享 victim', s.victim)}${metric('临界区内线程', s.pc.filter(p => p === 4).length, '', st === 'violation' ? 'bad' : '')}${metric('已执行原子步', s.steps)}</div><div class="threads">${[0, 1].map(i => `<div class="thread ${s.pc[i] === 4 ? 'in-critical' : ''}"><h4>T${i} · pc=${s.pc[i]}</h4><ol>${pcs[s.algorithm].map((p, k) => p === '—' ? '' : `<li class="${s.pc[i] === k ? 'active' : ''}"><code>${esc(p)}</code></li>`).join('')}</ol><small>下一步执行高亮语句；本地读到的 flag[j]=${+s.localFlag[i]}</small></div>`).join('')}</div>${status(statusName[st], ['violation', 'deadlock'].includes(st) ? 'warn' : '')}<div class="state-code">${esc(s.message)}\n有限可达状态数：${checkResult.states}\n有限模型互斥检查：${checkResult.bad ? '找到反例，调度 ' + checkResult.bad.path.join(' → ') : '未发现两个 pc 同时为 4'}</div><p class="lab-note">可达状态穷举仅覆盖这里的 SC、单次申请模型，不等于对任意轮次、无饥饿或弱内存实现的证明。LockTwo 单独申请也可能永远等待。</p>`;
            $('[data-lock=back]', el).disabled = cursor === 0;
            $('[data-lock=next]', el).disabled = cursor === trace.length - 1;
            $$('[data-thread]', el).forEach(b => b.disabled = s.pc[+b.dataset.thread] === 6);
            $('.counter', el).textContent = `${cursor} / ${trace.length - 1}`;
            el.dataset.step = cursor;
            el.dataset.steps = trace.length;
        }
        function push(i) { trace = trace.slice(0, cursor + 1); trace.push(E.lockStep(trace[cursor], i)); cursor++; paint(); }
        labs.locks = { el, getState: () => E.clone(trace[cursor]), getTrace: () => trace, getCursor: () => cursor, setCursor(i) { cursor = Math.max(0, Math.min(trace.length - 1, i)); paint(); }, getResult: () => checkResult, rebuild, render: paint };
        el.addEventListener('input', rebuild);
        el.addEventListener('click', e => { const b = e.target.closest('[data-thread],[data-lock],#lock-example'); if (!b)
            return; if (b.hasAttribute('data-thread'))
            push(+b.dataset.thread); if (b.dataset.lock === 'back')
            labs.locks.setCursor(cursor - 1); if (b.dataset.lock === 'next')
            labs.locks.setCursor(cursor + 1); if (b.dataset.lock === 'reset')
            rebuild(); if (b.id === 'lock-example') {
            rebuild();
            const a = str('lock-case'), single = str('lock-active') === 'single', schedule = single ? [0, 0, 0, 0, 0, 0] : a === 'peterson' ? [0, 1, 0, 1, 0, 1, 0, 1] : [0, 1, 0, 1];
            for (const i of schedule) {
                trace.push(E.lockStep(trace.at(-1), i));
            }
            cursor = trace.length - 1;
            paint();
        } });
        rebuild();
    }
    function initSources() {
        const data = window.SOURCE_DATA || [], dialog = $('#source-dialog');
        $('#source-catalog-list').innerHTML = data.map(s => `<div class="source-card"><div><h4>${s.id} · ${esc(s.title)}</h4><a class="source-url" href="${s.url}" target="_blank" rel="noopener">原课程章节 ↗</a></div><button data-src="${s.id}" data-at="">原文摘录</button><details><summary>原始标题与章节链接</summary><div class="source-anchor-list">${s.headings.map(h => `<a href="${s.url}${h.anchor ? '#' + h.anchor : ''}" target="_blank" rel="noopener">${esc(h.title)} ↗</a>`).join('')}</div></details></div>`).join('');
        function openSource(id, anchor = '') {
            const s = data.find(x => x.id === id);
            if (!s)
                return;
            $('#source-dialog-title').textContent = `原 ${s.id} · ${s.title}`;
            $('#source-dialog-meta').innerHTML = `原课程网页 · 无页码 · 原始锚点 #${esc(anchor || 'article')}<br><a href="${esc(s.url)}${anchor ? '#' + encodeURIComponent(anchor) : ''}" target="_blank" rel="noopener">打开原始出处 ↗</a>`;
            const body = $('#source-body');
            body.innerHTML = s.html;
            $$('[id]', body).forEach(e => { e.dataset.originalAnchor = e.id; e.id = 'source-' + e.id; });
            $$('a[href]', body).forEach(a => { const href = a.getAttribute('href'); if (href.startsWith('#')) {
                a.href = '#source-' + href.slice(1);
                a.addEventListener('click', e => { e.preventDefault(); body.querySelector('[data-original-anchor="' + CSS.escape(href.slice(1)) + '"]')?.scrollIntoView({ block: 'start' }); });
            }
            else if (!href.startsWith('javascript:')) {
                try {
                    a.href = new URL(href, s.url).href;
                    a.target = '_blank';
                    a.rel = 'noopener';
                }
                catch {
                    a.removeAttribute('href');
                }
            }
            else
                a.removeAttribute('href'); });
            renderMath(body);
            if (!dialog.open)
                dialog.showModal();
            body.scrollTop = 0;
            if (anchor) {
                const target = $('[data-original-anchor="' + CSS.escape(anchor) + '"]', body);
                if (target)
                    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
            }
            dialog.dataset.source = id;
            dialog.dataset.anchor = anchor;
        }
        window.openCourseSource = openSource;
        document.addEventListener('click', e => { const a = e.target.closest('button[data-src]'); if (a) {
            e.preventDefault();
            openSource(a.dataset.src, a.dataset.at || '');
        } });
        $('#close-source').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', e => { if (e.target === dialog) {
            const r = dialog.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
                dialog.close();
        } });
    }
    /* Each directory row carries its own subsection list; only the chapter being read stays open. */
    function buildTocTree() { const nav = $('#toc');
        if (!nav)
            return;
        for (const a of [...nav.querySelectorAll(':scope > a')]) {
            const target = $(a.getAttribute('href')), subs = target ? $$('h3[id]', target) : [], item = document.createElement('div');
            item.className = 'toc-item';
            a.before(item);
            item.append(a);
            if (subs.length) {
                const list = document.createElement('ul');
                list.className = 'toc-sub';
                list.innerHTML = subs.map(h => `<li><a href="#${h.id}">${esc(h.textContent.trim())}</a></li>`).join('');
                item.append(list);
            }
        } }
    function initReading() {
        buildTocTree();
        const body = document.body, menu = $('#menu-toggle');
        menu.addEventListener('click', () => { const on = body.classList.toggle('menu-open'); menu.setAttribute('aria-expanded', String(on)); });
        $$('#toc a,.dependency a').forEach(a => a.addEventListener('click', () => { body.classList.remove('menu-open'); menu.setAttribute('aria-expanded', 'false'); }));
        const theme = $('#theme-toggle'), font = $('#font-toggle');
        function pref() {}
        function getPref() { return null; }
        function setTheme(on) { body.classList.toggle('dark', on); theme.setAttribute('aria-pressed', String(on)); theme.textContent = on ? '日读' : '夜读'; pref('theme', String(on)); }
        function setFont(on) { body.classList.toggle('large-type', on); font.setAttribute('aria-pressed', String(on)); font.textContent=on?'标准字号':'放大字号'; pref('font', String(on)); scheduleMathAlign(); }
        theme.addEventListener('click', () => setTheme(!body.classList.contains('dark')));
        font.addEventListener('click', () => setFont(!body.classList.contains('large-type')));
        setTheme(getPref('theme') === 'true');
        setFont(getPref('font') === 'true');
        const links = $$('#toc a'), sections = links.map(a => $(a.getAttribute('href')));
        let ticking = false;
        function progress() { ticking = false; const d = document.documentElement, ratio = scrollY / Math.max(1, d.scrollHeight - innerHeight); $('#reading-progress').style.width = Math.max(0, Math.min(100, 100 * ratio)) + '%'; let current = sections[0]; sections.forEach(s => { if (s && s.getBoundingClientRect().top < 180)
            current = s; }); const active = links.find(a => a.hash === '#' + current.id) || links[0], item = active && active.closest('.toc-item');
            links.forEach(a => { const on = a === active; a.classList.toggle('active', on); if (on)
                a.setAttribute('aria-current', 'location');
            else
                a.removeAttribute('aria-current'); });
            $$('.toc-item').forEach(i => { i.classList.toggle('current', i === item); i.classList.toggle('open', i === item); }); }
        addEventListener('scroll', () => { if (!ticking) {
            requestAnimationFrame(progress);
            ticking = true;
        } }, { passive: true });
        progress();
        const search = $('#search'), results = $('#search-results'), items = $$('.chapter [id],.chapter[id],.intro h2[id]').filter(e => /^H[1-4]$/.test(e.tagName) || e.classList.contains('chapter')).map(e => ({ id: e.id, title: (e.classList.contains('chapter') ? e.dataset.chapter : e.textContent).trim(), text: e.classList.contains('chapter') ? e.textContent.toLowerCase() : e.parentElement.textContent.toLowerCase() }));
        search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); results.hidden = !q; if (!q) {
            results.innerHTML = '';
            return;
        } const matches = items.filter(x => x.title.toLowerCase().includes(q) || x.text.includes(q)).slice(0, 12); results.innerHTML = matches.length ? matches.map(x => `<a href="#${x.id}">${esc(x.title)}</a>`).join('') : '<span class="search-empty">没有找到；可尝试中文或英文算法名。</span>'; });
        results.addEventListener('click', e => { if (e.target.closest('a')) {
            results.hidden = true;
            body.classList.remove('menu-open');
            menu.setAttribute('aria-expanded', 'false');
        } });
        search.addEventListener('keydown', e => { if (e.key === 'Escape') {
            results.hidden = true;
            search.blur();
        } if (e.key === 'Enter')
            $('a', results)?.click(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#source-dialog').open) {
            body.classList.remove('menu-open');
            menu.setAttribute('aria-expanded', 'false');
        } });
        if($('#test-summary')) $('#test-summary').innerHTML='<p>验证分为原文覆盖、公式与算法、交互行为、大字号与响应式布局四部分。详细结果见独立测试报告。</p>';

    }
    const initializers = [initBoolean, initRepair, initQM, initMapping, initWire, initSA, initPartition, initOptimizer, initVectors, initLee, initSTA, initCPU, initPipeline, initCache, initMemory, initAmdahl, initLocks, initSources, initReading];
    for (const init of initializers) {
        try {
            init();
        }
        catch (e) {
            window.__APP_ERRORS.push(init.name + ': ' + e.stack);
            console.error(init.name, e);
        }
    }
    renderMath($('#main-content'));
    window.__EDA_READY = true;
})();
