/* Pure, deterministic teaching models. Browser and Node share this exact code.
   No measured chip results, remote calls, eval(), or random global state. */
(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports)
    module.exports = api;
else
    root.EDA = api; })(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const clone = x => JSON.parse(JSON.stringify(x));
    const sum = a => a.reduce((s, x) => s + x, 0), range = n => Array.from({ length: n }, (_, i) => i);
    function check(ok, msg) { if (!ok)
        throw new Error(msg); }
    function finite(x, name) { check(Number.isFinite(x), name + ' must be finite'); }
    function bits(i, n) { return range(n).map(k => (i >> (n - 1 - k)) & 1); }
    function truth(fn, n = 3) { return range(1 << n).map(i => +!!fn(...bits(i, n))); }
    function cofactors(table, variable, n = 3) {
        check(table.length === (1 << n) && table.every(x => x === 0 || x === 1), 'Invalid Boolean truth table');
        check(Number.isInteger(variable) && variable >= 0 && variable < n, 'Invalid variable');
        return range(1 << (n - 1)).map(i => { const rest = bits(i, n - 1); const ix = v => { const b = rest.slice(); b.splice(variable, 0, v); return b.reduce((a, x) => 2 * a + x, 0); }; const f0 = table[ix(0)], f1 = table[ix(1)]; return { rest, f0, f1, diff: f0 ^ f1, exists: f0 | f1, forall: f0 & f1 }; });
    }
    function repair(d) { check(d.length === 4 && d.every(v => v === 0 || v === 1), 'Expected four configuration bits'); return range(4).map(i => { const [a, b] = bits(i, 2), s0 = a & b, s1 = 1 - b, index = 2 * s1 + s0, f = (a & b) | (1 - b), g = d[index]; return { a, b, s0, s1, index, f, g, ok: f === g }; }); }
    function repairSolutions() { return range(16).map(i => bits(i, 4)).filter(d => repair(d).every(r => r.ok)); }
    function cubeMatches(c, i, n) { const b = bits(i, n); return [...c].every((v, k) => v === '-' || +v === b[k]); }
    function cubeLiteral(c) { return [...c].filter(x => x !== '-').length; }
    function cubeExpression(c, vars = ['a', 'b', 'c']) { if (!c || /^[-]+$/.test(c))
        return '1'; return [...c].map((v, i) => v === '-' ? '' : v === '1' ? vars[i] : '¬' + vars[i]).filter(Boolean).join('·'); }
    function minimize(table, n = 3) {
        check(Number.isInteger(n) && n >= 1 && n <= 4 && table.length === (1 << n) && table.every(v => v === 0 || v === 1), 'Exact minimizer supports binary tables of 1–4 variables');
        const ones = range(1 << n).filter(i => table[i]), rounds = [], primeSet = new Set();
        let group = ones.map(i => bits(i, n).join(''));
        while (group.length) {
            const used = new Set(), next = new Set(), merges = [];
            for (let i = 0; i < group.length; i++)
                for (let j = i + 1; j < group.length; j++) {
                    let diff = 0, pos = -1, ok = true;
                    for (let k = 0; k < n; k++) {
                        if (group[i][k] !== group[j][k]) {
                            if (group[i][k] === '-' || group[j][k] === '-') {
                                ok = false;
                                break;
                            }
                            diff++;
                            pos = k;
                        }
                    }
                    if (ok && diff === 1) {
                        used.add(group[i]);
                        used.add(group[j]);
                        const c = group[i].slice(0, pos) + '-' + group[i].slice(pos + 1);
                        next.add(c);
                        merges.push({ from: [group[i], group[j]], to: c });
                    }
                }
            const newPrimes = group.filter(c => !used.has(c));
            newPrimes.forEach(c => primeSet.add(c));
            rounds.push({ group: group.slice(), merges, primes: newPrimes });
            group = [...next].sort();
        }
        const primes = [...primeSet].sort(), covers = primes.map(c => ones.filter(i => cubeMatches(c, i, n)));
        let best = { literal: Infinity, terms: Infinity, cubes: [] };
        // Exact cover search for this bounded teaching problem; not an ESPRESSO implementation.
        function visit(start, selected, covered, lits) {
            if (lits > best.literal)
                return;
            if (ones.every(x => covered.has(x))) {
                if (lits < best.literal || (lits === best.literal && selected.length < best.terms))
                    best = { literal: lits, terms: selected.length, cubes: selected.map(i => primes[i]) };
                return;
            }
            for (let k = start; k < primes.length; k++)
                visit(k + 1, [...selected, k], new Set([...covered, ...covers[k]]), lits + cubeLiteral(primes[k]));
        }
        visit(0, [], new Set(), 0);
        if (!ones.length)
            best = { literal: 0, terms: 0, cubes: [] };
        return { ones, rounds, primes, covers, ...best, expression: !ones.length ? '0' : best.cubes.map(c => cubeExpression(c, range(n).map(i => 'abcd'[i]))).join(' + ') };
    }
    function leaf(id) { return { id, op: 'IN', children: [] }; }
    function node(id, op, ...children) { return { id, op, children }; }
    const W = '*';
    const CELL_PATTERNS = [
        { name: 'NOT', p: { op: 'NOT', children: [W] } }, { name: 'AND2', p: { op: 'AND', children: [W, W] } },
        { name: 'OR2', p: { op: 'OR', children: [W, W] } }, { name: 'NAND2', p: { op: 'NAND', children: [W, W] } },
        { name: 'OA21', p: { op: 'AND', children: [{ op: 'OR', children: [W, W] }, W] } },
        { name: 'AO21', p: { op: 'OR', children: [{ op: 'AND', children: [W, W] }, W] } },
        { name: 'AOI21', p: { op: 'NOT', children: [{ op: 'OR', children: [{ op: 'AND', children: [W, W] }, W] }] } }
    ];
    function mappingCase(which = 'oa', swap = false) { let t; if (which === 'aoi')
        t = node('z', 'NOT', node('u', 'OR', node('v', 'AND', leaf('a'), leaf('b')), leaf('c')));
    else if (which === 'nested')
        t = node('z', 'OR', node('u', 'AND', node('v', 'OR', leaf('a'), leaf('b')), leaf('c')), leaf('d'));
    else
        t = node('z', 'AND', node('u', 'OR', leaf('b'), leaf('c')), leaf('a')); if (swap) {
        function flip(x) { x.children.reverse(); x.children.forEach(flip); }
        flip(t);
    } return t; }
    function matchPattern(tree, p) {
        if (p === W)
            return [[tree]];
        if (tree.op !== p.op || tree.children.length !== p.children.length)
            return [];
        const orders = [tree.children];
        if (['AND', 'OR', 'NAND'].includes(tree.op) && tree.children.length === 2)
            orders.push(tree.children.slice().reverse());
        const out = [];
        for (const ch of orders) {
            let lists = [[]];
            for (let i = 0; i < ch.length; i++) {
                const m = matchPattern(ch[i], p.children[i]);
                lists = lists.flatMap(a => m.map(b => [...a, ...b]));
            }
            out.push(...lists);
        }
        const seen = new Set();
        return out.filter(x => { const k = x.map(v => v.id).sort().join(','); if (seen.has(k))
            return false; seen.add(k); return true; });
    }
    function mapTree(tree, costs = { NOT: 1, AND2: 3, OR2: 3, NAND2: 2, OA21: 4, AO21: 4, AOI21: 4 }) {
        const memo = {}, trace = [];
        function solve(t) {
            if (memo[t.id])
                return memo[t.id];
            t.children.forEach(solve);
            if (t.op === 'IN') {
                memo[t.id] = { cost: 0, cell: 'PI', boundary: [], candidates: [] };
                trace.push({ id: t.id, ...memo[t.id] });
                return memo[t.id];
            }
            const candidates = [];
            for (const c of CELL_PATTERNS) {
                const price = costs[c.name];
                if (!Number.isFinite(price) || price < 0)
                    continue;
                for (const boundary of matchPattern(t, c.p)) {
                    const child = sum(boundary.map(b => memo[b.id].cost));
                    candidates.push({ cell: c.name, boundary: boundary.map(b => b.id), price, child, total: price + child });
                }
            }
            candidates.sort((a, b) => a.total - b.total || a.cell.localeCompare(b.cell));
            const win = candidates[0];
            memo[t.id] = { cost: win ? win.total : Infinity, cell: win ? win.cell : '无法覆盖', boundary: win ? win.boundary : [], candidates };
            trace.push({ id: t.id, ...memo[t.id] });
            return memo[t.id];
        }
        const solution = solve(tree), selected = [];
        function walk(t) { const r = memo[t.id]; if (t.op === 'IN')
            return; selected.push({ id: t.id, cell: r.cell }); for (const id of r.boundary) {
            function locate(x) { if (x.id === id)
                return x; for (const c of x.children) {
                const y = locate(c);
                if (y)
                    return y;
            } }
            walk(locate(t));
        } }
        if (Number.isFinite(solution.cost))
            walk(tree);
        return { cost: solution.cost, trace, memo, selected };
    }
    function evalTree(t, values) { const c = t.children.map(x => evalTree(x, values)); if (t.op === 'IN')
        return values[t.id]; if (t.op === 'NOT')
        return 1 - c[0]; if (t.op === 'AND')
        return c[0] & c[1]; if (t.op === 'OR')
        return c[0] | c[1]; if (t.op === 'NAND')
        return 1 - (c[0] & c[1]); throw new Error('Unknown tree op'); }
    function hpwl(p) { if (!p.length)
        return 0; return Math.max(...p.map(x => x[0])) - Math.min(...p.map(x => x[0])) + Math.max(...p.map(x => x[1])) - Math.min(...p.map(x => x[1])); }
    function cliqueL1(p) { let s = 0; for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++)
            s += Math.abs(p[i][0] - p[j][0]) + Math.abs(p[i][1] - p[j][1]); return s; }
    function starQuadratic(p) { const center = [0, 1].map(k => sum(p.map(x => x[k])) / p.length); return { center, energy: sum(p.map(x => (x[0] - center[0]) ** 2 + (x[1] - center[1]) ** 2)) }; }
    function hanan(pins) {
        const p = [...new Map(pins.map(p => [p.join(','), p])).values()];
        check(p.length >= 1 && p.length <= 6, 'Hanan exact solver supports at most 6 unique pins');
        p.flat().forEach(x => finite(x, 'coordinate'));
        const xs = [...new Set(p.map(x => x[0]))].sort((a, b) => a - b), ys = [...new Set(p.map(x => x[1]))].sort((a, b) => a - b), vertices = ys.flatMap(y => xs.map(x => [x, y]));
        const adj = vertices.map(() => []), edges = [];
        for (let y = 0; y < ys.length; y++)
            for (let x = 0; x < xs.length; x++) {
                const u = y * xs.length + x;
                for (const [xx, yy] of [[x + 1, y], [x, y + 1]])
                    if (xx < xs.length && yy < ys.length) {
                        const v = yy * xs.length + xx, w = Math.abs(xs[xx] - xs[x]) + Math.abs(ys[yy] - ys[y]);
                        adj[u].push([v, w]);
                        adj[v].push([u, w]);
                        edges.push([u, v, w]);
                    }
            }
        const terminals = p.map(q => vertices.findIndex(v => v[0] === q[0] && v[1] === q[1]));
        return { vertices, adj, edges, terminals, xs, ys };
    }
    function steiner(pins) {
        const g = hanan(pins), n = g.vertices.length, k = g.terminals.length, full = (1 << k) - 1, dp = range(full + 1).map(() => Array(n).fill(Infinity)), parent = range(full + 1).map(() => Array(n).fill(null));
        for (let i = 0; i < k; i++) {
            dp[1 << i][g.terminals[i]] = 0;
            parent[1 << i][g.terminals[i]] = { type: 'terminal' };
        }
        for (let mask = 1; mask <= full; mask++) {
            for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
                const other = mask ^ sub;
                if (!other || sub > other)
                    continue;
                for (let v = 0; v < n; v++) {
                    const d = dp[sub][v] + dp[other][v];
                    if (d < dp[mask][v] - 1e-12) {
                        dp[mask][v] = d;
                        parent[mask][v] = { type: 'split', sub };
                    }
                }
            }
            const used = Array(n).fill(false);
            for (let iter = 0; iter < n; iter++) {
                let u = -1;
                for (let v = 0; v < n; v++)
                    if (!used[v] && (u < 0 || dp[mask][v] < dp[mask][u]))
                        u = v;
                if (u < 0 || !Number.isFinite(dp[mask][u]))
                    break;
                used[u] = true;
                for (const [v, w] of g.adj[u])
                    if (dp[mask][u] + w < dp[mask][v] - 1e-12) {
                        dp[mask][v] = dp[mask][u] + w;
                        parent[mask][v] = { type: 'move', to: u };
                    }
            }
        }
        let root = 0;
        for (let v = 1; v < n; v++)
            if (dp[full][v] < dp[full][root])
                root = v;
        const chosen = new Map(), seen = new Set();
        function unwind(m, v) { const key = m + ':' + v; if (seen.has(key))
            return; seen.add(key); const r = parent[m][v]; if (!r)
            return; if (r.type === 'split') {
            unwind(r.sub, v);
            unwind(m ^ r.sub, v);
        }
        else if (r.type === 'move') {
            const [a, b] = [v, r.to].sort((a, b) => a - b);
            chosen.set(a + ',' + b, [a, b]);
            unwind(m, r.to);
        } }
        unwind(full, root);
        return { ...g, length: dp[full][root], treeEdges: [...chosen.values()], states: full * n };
    }
    function smoothSpan(xs, tau) { check(tau > 0 && Number.isFinite(tau), 'tau must be positive'); check(xs.length > 0, 'Empty coordinates'); xs.forEach(x => finite(x, 'coordinate')); const max = Math.max(...xs), min = Math.min(...xs), ep = xs.map(x => Math.exp((x - max) / tau)), em = xs.map(x => Math.exp((min - x) / tau)), sp = sum(ep), sm = sum(em); return { value: max - min + tau * (Math.log(sp) + Math.log(sm)), grad: xs.map((_, i) => ep[i] / sp - em[i] / sm), bound: 2 * tau * Math.log(xs.length) }; }
    function linearSolve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let k = 0; k < n; k++) {
        let p = k;
        for (let i = k + 1; i < n; i++)
            if (Math.abs(M[i][k]) > Math.abs(M[p][k]))
                p = i;
        check(Math.abs(M[p][k]) > 1e-12, 'Singular system');
        [M[p], M[k]] = [M[k], M[p]];
        const d = M[k][k];
        for (let j = k; j <= n; j++)
            M[k][j] /= d;
        for (let i = 0; i < n; i++)
            if (i !== k) {
                const m = M[i][k];
                for (let j = k; j <= n; j++)
                    M[i][j] -= m * M[k][j];
            }
    } return M.map(r => r[n]); }
    const anchors = [[0, 5], [10, 5]];
    function optEdges() { return [...range(4).flatMap(i => [[i, 4, 1], [i, 5, 1]]), [0, 1, .3], [1, 2, .3], [2, 3, .3]]; }
    function optEnergy(pos, mode = 'quadratic', lambda = 0, tau = .6) {
        const all = [...pos, ...anchors], grad = pos.map(() => [0, 0]);
        let wire = 0, density = 0;
        for (const [i, j, w] of optEdges())
            for (let k = 0; k < 2; k++) {
                let d, value;
                if (mode === 'quadratic') {
                    d = w * (all[i][k] - all[j][k]);
                    value = .5 * w * (all[i][k] - all[j][k]) ** 2;
                }
                else {
                    const f = smoothSpan([all[i][k], all[j][k]], tau);
                    value = w * f.value;
                    d = w * f.grad[0];
                }
                wire += value;
                if (i < 4)
                    grad[i][k] += d;
                if (j < 4)
                    grad[j][k] -= d;
            }
        const sigma = 1.4;
        for (let i = 0; i < 4; i++)
            for (let j = i + 1; j < 4; j++) {
                const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], r = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                density += r;
                if (mode !== 'quadratic') {
                    grad[i][0] -= lambda * r * dx / (sigma * sigma);
                    grad[j][0] += lambda * r * dx / (sigma * sigma);
                    grad[i][1] -= lambda * r * dy / (sigma * sigma);
                    grad[j][1] += lambda * r * dy / (sigma * sigma);
                }
            }
        return { wire, density, value: wire + (mode === 'quadratic' ? 0 : lambda * density), grad, norm: Math.sqrt(sum(grad.flat().map(x => x * x))) };
    }
    function optStep(state, options) {
        const { mode, lambda, tau } = options, prev = optEnergy(state.pos, mode, lambda, tau);
        let eta = .4, next = state.pos;
        for (let tries = 0; tries < 28; tries++) {
            const candidate = state.pos.map((p, i) => p.map((v, k) => Math.max(.5, Math.min(9.5, v - eta * prev.grad[i][k]))));
            const direction = sum(candidate.flatMap((p, i) => p.map((v, k) => (v - state.pos[i][k]) * prev.grad[i][k]))), q = optEnergy(candidate, mode, lambda, tau);
            if (q.value <= prev.value + 1e-4 * direction + 1e-12) {
                next = candidate;
                break;
            }
            eta *= .5;
        }
        return { pos: next, iteration: state.iteration + 1, eta, ...optEnergy(next, mode, lambda, tau) };
    }
    function quadraticSolution() { const A = range(4).map(() => Array(4).fill(0)), b = [Array(4).fill(0), Array(4).fill(0)]; for (const [i, j, w] of optEdges()) {
        A[i][i] += w;
        if (j < 4) {
            A[j][j] += w;
            A[i][j] -= w;
            A[j][i] -= w;
        }
        else
            for (let k = 0; k < 2; k++)
                b[k][i] += w * anchors[j - 4][k];
    } const x = linearSolve(A, b[0]), y = linearSolve(A, b[1]); return { A, b, pos: x.map((v, i) => [v, y[i]]) }; }
    function gradientError(pos, mode, lambda, tau) { const g = optEnergy(pos, mode, lambda, tau).grad; let err = 0; const h = 1e-5; for (let i = 0; i < pos.length; i++)
        for (let k = 0; k < 2; k++) {
            const a = clone(pos), b = clone(pos);
            a[i][k] += h;
            b[i][k] -= h;
            const fd = (optEnergy(a, mode, lambda, tau).value - optEnergy(b, mode, lambda, tau).value) / (2 * h);
            err = Math.max(err, Math.abs(fd - g[i][k]));
        } return err; }
    function rng(seed) { let s = seed >>> 0; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return { seed: s >>> 0, value: (s >>> 0) / 4294967296 }; }
    function saEnergy(pos, lambda) { const p = [...pos, [0, 5], [10, 5]], nets = [[4, 0], [0, 1, 2], [1, 3], [2, 3, 5]]; const wire = sum(nets.map(n => hpwl(n.map(i => p[i])))); let overlap = 0; for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
            const a = Math.max(0, 1.8 - Math.abs(pos[i][0] - pos[j][0])) * Math.max(0, 1.2 - Math.abs(pos[i][1] - pos[j][1]));
            overlap += a * a;
        } return { wire, overlap, value: wire + lambda * overlap }; }
    function saStep(state, lambda, cooling = .95) {
        let seed = state.seed;
        function random() { const v = rng(seed); seed = v.seed; return v.value; }
        const cand = clone(state.pos), i = Math.floor(random() * 4);
        let move;
        if (random() < .25) {
            let j = (i + 1 + Math.floor(random() * 3)) % 4;
            [cand[i], cand[j]] = [cand[j], cand[i]];
            move = `交换 ${i + 1} 与 ${j + 1}`;
        }
        else {
            cand[i] = cand[i].map((v, k) => Math.max(k === 0 ? .9 : .6, Math.min(k === 0 ? 9.1 : 9.4, v + (random() - .5) * 3)));
            move = `移动单元 ${i + 1}`;
        }
        const before = saEnergy(state.pos, lambda), after = saEnergy(cand, lambda), delta = after.value - before.value, prob = delta <= 0 ? 1 : state.temperature > 0 ? Math.exp(-delta / state.temperature) : 0, u = random(), accepted = u < prob;
        return { pos: accepted ? cand : clone(state.pos), candidate: cand, seed, temperature: state.temperature * cooling, usedTemperature: state.temperature, iteration: state.iteration + 1, delta, prob, u, accepted, move, energy: accepted ? after : before };
    }
    const partitionNets = [[0, 1, 2], [0, 1], [1, 2], [2, 3], [3, 4, 5], [3, 4], [4, 5], [0, 5]];
    function partitionCost(assign, tolerance = 0) { const n = assign.length, left = assign.filter(x => x === 0).length, right = n - left, cuts = partitionNets.map(net => new Set(net.map(i => assign[i])).size > 1); return { left, right, cut: cuts.filter(Boolean).length, cuts, balanced: Math.abs(left - right) / n <= tolerance + 1e-12 }; }
    function partitionEnumerate(tolerance = 0) { const states = range(64).map(m => { const assign = bits(m, 6); return { mask: m, assign, ...partitionCost(assign, tolerance) }; }), valid = states.filter(s => s.balanced), best = valid.reduce((a, b) => !a || b.cut < a.cut ? b : a, null); return { states, valid, best }; }
    function gridCase(which = 'source') {
        if (which === 'sealed')
            return { w: 5, h: 5, start: 0, target: 12, blocked: [7, 11, 13, 17] };
        if (which === 'maze')
            return { w: 9, h: 7, start: 0, target: 62, blocked: [4, 13, 22, 31, 40, 49, 12, 11, 10, 30, 39, 48, 57, 43, 44, 24, 25, 26] };
        return { w: 5, h: 5, start: 0, target: 14, blocked: [6, 7, 8] };
    }
    function gridNeighbors(u, w, h) { const x = u % w, y = Math.floor(u / w); return [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < w && y < h).map(([x, y]) => y * w + x); }
    function lee(config) {
        const { w, h, start, target } = config, blocked = new Set(config.blocked);
        check(Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w * h <= 400, 'Invalid grid');
        check(start >= 0 && start < w * h && target >= 0 && target < w * h && !blocked.has(start) && !blocked.has(target), 'Endpoints must be free');
        const dist = Array(w * h).fill(-1), parent = Array(w * h).fill(-1), queue = [start], trace = [];
        dist[start] = 0;
        let head = 0, expanded = 0, path = [], current = start;
        const snap = (phase, message) => trace.push({ phase, message, dist: dist.slice(), queue: queue.slice(head), path: path.slice(), current, expanded });
        snap('init', '将起点入队，距离设为 0。');
        let found = false;
        while (head < queue.length) {
            const u = queue[head++];
            current = u;
            expanded++;
            if (u === target) {
                found = true;
                snap('found', '终点出队，开始回溯。');
                break;
            }
            for (const v of gridNeighbors(u, w, h))
                if (!blocked.has(v) && dist[v] < 0) {
                    dist[v] = dist[u] + 1;
                    parent[v] = u;
                    queue.push(v);
                }
            snap('wave', `弹出 (${u % w},${Math.floor(u / w)})，为尚未访问的邻格标记 ${dist[u] + 1}。`);
        }
        if (found) {
            current = target;
            path = [target];
            snap('trace', '从终点开始，每步走向距离小 1 的邻格。');
            while (current !== start) {
                current = parent[current];
                check(current >= 0, 'Broken predecessor');
                path.push(current);
                snap(current === start ? 'done' : 'trace', current === start ? '回溯到达起点。' : '选择一个前驱；最短路径不一定唯一。');
            }
        }
        else
            snap('unreachable', '队列为空且终点未到达：在此网格模型中不可达。');
        return { dist, parent, path: path.slice().reverse(), trace, expanded, distance: dist[target] };
    }
    function codeDistance(d, mode) { if (d < 0)
        return -1; if (mode === 'mod3')
        return d % 3; if (mode === 'pair')
        return Math.floor(d / 2) % 2; if (mode === 'parity')
        return d % 2; return d; }
    function retraceCodes(config, labels, phase, mode) { check(['mod3', 'pair'].includes(mode), 'Parity alone cannot distinguish predecessor from successor'); const { w, h, start, target } = config, blocked = new Set(config.blocked); let current = target, k = phase, path = [target]; const period = mode === 'mod3' ? 3 : 4; for (let t = 0; t < w * h && current !== start; t++) {
        k = (k - 1 + period) % period;
        const want = mode === 'mod3' ? k : Math.floor(k / 2) % 2, choices = gridNeighbors(current, w, h).filter(v => !blocked.has(v) && labels[v] >= 0 && labels[v] === want);
        check(choices.length > 0, 'No compressed predecessor');
        current = choices[0];
        path.push(current);
    } check(current === start, 'Compressed backtrace failed'); return path.reverse(); }
    function timingCase(which = 'diamond', scale = 1) { const n = which === 'branch' ? 6 : 5; const edges = which === 'branch' ? [[0, 1, .12, .3, 'cell'], [0, 2, .08, .2, 'net'], [1, 3, .1, .25, 'net'], [2, 3, .07, .4, 'cell'], [1, 4, .16, .5, 'cell'], [3, 5, .1, .28, 'cell'], [4, 5, .09, .22, 'net']] : [[0, 1, .1, .3, 'cell'], [0, 2, .08, .2, 'net'], [1, 3, .12, .4, 'net'], [2, 3, .06, .15, 'cell'], [3, 4, .08, .2, 'cell']]; return { names: range(n).map(i => i === 0 ? 'S' : i === n - 1 ? 'T' : String.fromCharCode(64 + i)), edges: edges.map(([u, v, min, max, type]) => ({ u, v, min: min * scale, max: max * scale, type })) }; }
    function topo(graph) { const n = graph.names.length, deg = Array(n).fill(0), adj = range(n).map(() => []); for (const e of graph.edges) {
        check(e.u >= 0 && e.u < n && e.v >= 0 && e.v < n, 'Invalid arc');
        check(e.min >= 0 && e.max >= e.min, 'Invalid delay range');
        deg[e.v]++;
        adj[e.u].push(e.v);
    } const q = range(n).filter(i => deg[i] === 0), order = []; for (let h = 0; h < q.length; h++) {
        const u = q[h];
        order.push(u);
        for (const v of adj[u])
            if (--deg[v] === 0)
                q.push(v);
    } check(order.length === n, 'Timing graph must be a DAG'); return order; }
    function sta(graph, options = { T: 1.2, setup: .1, hold: .15, skew: 0, qmin: .04, qmax: .08 }) {
        options = { T: 1.2, setup: .1, hold: .15, skew: 0, qmin: .04, qmax: .08, ...options };
        const { T, setup, hold, skew, qmin, qmax } = options;
        [T, setup, hold, skew, qmin, qmax].forEach(x => finite(x, 'timing option'));
        check(T > 0 && setup >= 0 && hold >= 0 && qmin >= 0 && qmax >= qmin, 'Invalid timing constraints');
        const n = graph.names.length, order = topo(graph), incoming = range(n).map(() => []), outgoing = range(n).map(() => []);
        graph.edges.forEach(e => { incoming[e.v].push(e); outgoing[e.u].push(e); });
        const early = Array(n).fill(Infinity), late = Array(n).fill(-Infinity), required = Array(n).fill(Infinity), pred = Array(n).fill(-1), trace = [];
        function snapshot(phase, u, message) { trace.push({ phase, u, message, early: early.map(x => Number.isFinite(x) ? x : null), late: late.map(x => Number.isFinite(x) ? x : null), required: required.map(x => Number.isFinite(x) ? x : null) }); }
        snapshot('init', -1, '仅为 DAG、单个同周期时钟域教学模型。');
        for (const u of order) {
            if (!incoming[u].length) {
                early[u] = qmin;
                late[u] = qmax;
            }
            else
                for (const e of incoming[u]) {
                    early[u] = Math.min(early[u], early[e.u] + e.min);
                    const a = late[e.u] + e.max;
                    if (a > late[u]) {
                        late[u] = a;
                        pred[u] = e.u;
                    }
                }
            snapshot('forward', u, `正向计算 ${graph.names[u]}：早到取 min，晚到取 max。`);
        }
        const endpoints = range(n).filter(i => !outgoing[i].length);
        for (const u of order.slice().reverse()) {
            required[u] = outgoing[u].length ? Math.min(...outgoing[u].map(e => required[e.v] - e.max)) : T + skew - setup;
            snapshot('backward', u, `反向计算 ${graph.names[u]} 的 setup RAT：取 min。`);
        }
        const setupSlack = late.map((a, i) => required[i] - a), holdSlack = endpoints.map(i => ({ i, slack: early[i] - (skew + hold) }));
        let worst = endpoints[0];
        for (const i of endpoints)
            if (setupSlack[i] < setupSlack[worst])
                worst = i;
        const critical = [];
        for (let u = worst; u >= 0; u = pred[u])
            critical.push(u);
        snapshot('done', worst, '检查 setup 与 hold。改变周期只直接改变 setup 要求。');
        return { early, late, required, setupSlack, holdSlack, trace, critical: critical.reverse(), endpoints, order };
    }
    function cpuTime(IC, CPI, clockNs) { [IC, CPI, clockNs].forEach(x => check(x >= 0 && Number.isFinite(x), 'Invalid performance input')); return IC * CPI * clockNs * 1e-9; }
    function cacheTrace(addresses, { sets = 4, ways = 1, block = 4 } = {}) {
        check([sets, ways, block].every(x => Number.isInteger(x) && x > 0 && x <= 64), 'Invalid cache geometry');
        const lines = range(sets).map(() => range(ways).map(() => null)), trace = [{ lines: clone(lines), hits: 0, misses: 0, index: -1, message: '空缓存（valid 位全为 0）。' }];
        let hits = 0, misses = 0;
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            check(Number.isSafeInteger(address) && address >= 0, 'Address must be a nonnegative integer');
            const b = Math.floor(address / block), set = b % sets, tag = Math.floor(b / sets), offset = address % block;
            let way = lines[set].findIndex(x => x && x.tag === tag), hit = way >= 0, evicted = null;
            if (hit)
                hits++;
            else {
                misses++;
                way = lines[set].findIndex(x => x === null);
                if (way < 0) {
                    way = 0;
                    for (let w = 1; w < ways; w++)
                        if (lines[set][w].used < lines[set][way].used)
                            way = w;
                    evicted = lines[set][way].tag;
                }
            }
            lines[set][way] = { tag, used: i, block: b };
            trace.push({ lines: clone(lines), hits, misses, index: i, address, blockNumber: b, set, tag, offset, way, hit, evicted, message: hit ? '标签命中，更新 LRU 次序。' : evicted === null ? '未命中，填入空路。' : `未命中，替换最久未访问的 tag=${evicted}。` });
        }
        return { trace, hits, misses, missRate: addresses.length ? misses / addresses.length : 0 };
    }
    function memoryPerf({ IC = 1e6, ideal = 1, access = .4, miss = .1, penalty = 100, clock = 1 }) { check([IC, ideal, access, miss, penalty, clock].every(x => Number.isFinite(x) && x >= 0) && miss <= 1, 'Invalid memory parameters'); const stall = access * miss * penalty, cpi = ideal + stall; return { stall, cpi, seconds: cpuTime(IC, cpi, clock) }; }
    function amdahl(P, N, h = 0, mode = 'parallel') { check([P, N, h].every(Number.isFinite) && P >= 0 && P <= 1 && Number.isInteger(N) && N >= 1 && h >= 0 && ['parallel', 'baseline'].includes(mode), 'Invalid Amdahl parameters'); const overhead = mode === 'baseline' ? h * P : h * P / N, time = (1 - P) + P / N + overhead, speedup = 1 / time, limit = mode === 'baseline' ? 1 / (1 - P + h * P) : (P === 1 ? Infinity : 1 / (1 - P)); return { serial: 1 - P, parallel: P / N, overhead, time, speedup, limit, efficiency: speedup / N }; }
    function minProcessors(P, target) { check(Number.isFinite(P) && Number.isFinite(target) && P >= 0 && P <= 1 && target > 0, 'Invalid target'); if (target <= 1)
        return 1; const d = 1 / target - (1 - P), tol = 8 * Number.EPSILON * Math.max(1 / target, 1 - P); return d <= tol ? Infinity : Math.ceil(P / d - 1e-12); }
    function pipelineProgram(which = 'independent') {
        if (which === 'load')
            return [{ op: 'LW', rd: 1, rs: [0], imm: 0 }, { op: 'ADD', rd: 2, rs: [1, 1] }, { op: 'ADD', rd: 3, rs: [2, 1] }, { op: 'SW', rs: [0, 3], imm: 4 }, { op: 'LW', rd: 4, rs: [0], imm: 4 }];
        if (which === 'branch')
            return [{ op: 'ADDI', rd: 1, rs: [0], imm: 1 }, { op: 'BEQ', rs: [1, 1], target: 4 }, { op: 'ADDI', rd: 2, rs: [0], imm: 99 }, { op: 'ADDI', rd: 3, rs: [0], imm: 88 }, { op: 'ADDI', rd: 2, rs: [0], imm: 7 }, { op: 'ADD', rd: 4, rs: [1, 2] }];
        if (which === 'dependent')
            return [{ op: 'ADDI', rd: 1, rs: [0], imm: 3 }, { op: 'ADD', rd: 2, rs: [1, 1] }, { op: 'ADD', rd: 3, rs: [2, 1] }, { op: 'ADD', rd: 4, rs: [3, 2] }];
        return range(5).map(i => ({ op: 'ADDI', rd: i + 1, rs: [0], imm: i + 2 }));
    }
    function instructionText(i) { if (i.op === 'ADDI')
        return `addi r${i.rd}, r${i.rs[0]}, ${i.imm}`; if (i.op === 'ADD')
        return `add r${i.rd}, r${i.rs[0]}, r${i.rs[1]}`; if (i.op === 'LW')
        return `lw r${i.rd}, ${i.imm}(r${i.rs[0]})`; if (i.op === 'SW')
        return `sw r${i.rs[1]}, ${i.imm}(r${i.rs[0]})`; return `beq r${i.rs[0]}, r${i.rs[1]}, @${i.target}`; }
    function pipelineInitial(program) { const first = program.length ? { ...clone(program[0]), pc: 0, uid: 0 } : null; return { cycle: 0, pc: first ? 1 : 0, nextUid: first ? 1 : 0, stages: [first, null, null, null, null], regs: Array(8).fill(0), memory: { 0: 5, 4: 0 }, retired: [], history: [], stalls: 0, flushes: 0, message: '初始化取指；第 1 个周期尚未执行。' }; }
    function pipelineStep(state, program, { forward = true, unified = false } = {}) {
        const s = clone(state), old = s.stages, [IF, ID, EX, MEM, WB] = old;
        const occupancy = old.map(i => i ? { uid: i.uid, pc: i.pc, op: i.op } : null);
        s.cycle++;
        if (WB) {
            if (WB.rd && WB.value !== undefined)
                s.regs[WB.rd] = WB.value;
            s.retired.push({ pc: WB.pc, uid: WB.uid });
        }
        s.regs[0] = 0;
        let newWB = MEM ? clone(MEM) : null;
        if (MEM && MEM.op === 'LW')
            newWB.value = s.memory[MEM.address] ?? 0;
        if (MEM && MEM.op === 'SW')
            s.memory[MEM.address] = MEM.storeValue;
        let newMEM = EX ? clone(EX) : null, branch = false, target = null;
        if (EX) {
            const vals = EX.rs.map((r, k) => { if (r === 0)
                return 0; let v = EX.operands[k]; if (forward) {
                if (WB && WB.rd === r && WB.value !== undefined)
                    v = WB.value;
                if (MEM && MEM.rd === r && MEM.op !== 'LW' && MEM.value !== undefined)
                    v = MEM.value;
            } return v; });
            if (EX.op === 'ADD')
                newMEM.value = vals[0] + vals[1];
            if (EX.op === 'ADDI')
                newMEM.value = vals[0] + EX.imm;
            if (['LW', 'SW'].includes(EX.op)) {
                newMEM.address = vals[0] + EX.imm;
                if (EX.op === 'SW')
                    newMEM.storeValue = vals[1];
            }
            if (EX.op === 'BEQ' && vals[0] === vals[1]) {
                branch = true;
                target = EX.target;
            }
        }
        const hazard = ID && ID.rs.some(r => r !== 0 && (forward ? EX && EX.op === 'LW' && EX.rd === r : [EX, MEM].some(p => p && p.rd === r))), memBusy = unified && MEM && ['LW', 'SW'].includes(MEM.op);
        let newEX = null, newID = null, newIF = null;
        function fetch() { if (s.pc < program.length) {
            const i = { ...clone(program[s.pc]), pc: s.pc, uid: s.nextUid++ };
            s.pc++;
            return i;
        } return null; }
        if (branch) {
            s.flushes += (IF ? 1 : 0) + (ID ? 1 : 0);
            s.pc = target;
            if (memBusy && s.pc < program.length)
                s.stalls++;
            newIF = memBusy ? null : fetch();
            s.message = 'EX 判定分支成立，清空错误路径上的 IF/ID。';
        }
        else if (hazard) {
            newID = ID;
            newIF = IF;
            s.stalls++;
            s.message = forward ? 'load-use：保持 IF/ID，向 EX 插入气泡。' : '无转发：等待源寄存器的生产者完成 WB。';
        }
        else {
            newEX = ID ? { ...ID, operands: ID.rs.map(r => s.regs[r]) } : null;
            newID = IF;
            const needFetch = s.pc < program.length;
            newIF = memBusy ? null : fetch();
            if (memBusy && needFetch) {
                s.stalls++;
                s.message = '单端口统一存储器被 MEM 使用，本周期暂停取指。';
            }
            else
                s.message = '各级推进；WB 在本周期 ID 读寄存器前提交。';
        }
        s.stages = [newIF, newID, newEX, newMEM, newWB];
        s.history.push({ cycle: s.cycle, occupancy, stalled: !!hazard, branch, memBusy: !!memBusy });
        return s;
    }
    function runPipeline(program, options) { let s = pipelineInitial(program), trace = [s]; for (let k = 0; k < 500 && (s.stages.some(Boolean) || s.pc < program.length); k++) {
        s = pipelineStep(s, program, options);
        trace.push(s);
    } check(!(s.stages.some(Boolean) || s.pc < program.length), 'Pipeline did not terminate'); return { trace, final: s }; }
    function sequential(program) { const regs = Array(8).fill(0), memory = { 0: 5, 4: 0 }, retired = []; let pc = 0; for (let k = 0; k < 500 && pc < program.length; k++) {
        const i = program[pc], v = i.rs.map(r => regs[r]);
        retired.push(pc);
        let next = pc + 1;
        if (i.op === 'ADD')
            regs[i.rd] = v[0] + v[1];
        else if (i.op === 'ADDI')
            regs[i.rd] = v[0] + i.imm;
        else if (i.op === 'LW')
            regs[i.rd] = memory[v[0] + i.imm] ?? 0;
        else if (i.op === 'SW')
            memory[v[0] + i.imm] = v[1];
        else if (i.op === 'BEQ' && v[0] === v[1])
            next = i.target;
        regs[0] = 0;
        pc = next;
    } check(pc >= program.length, 'Sequential model did not terminate'); return { regs, memory, retired }; }
    function lockInitial(algorithm = 'peterson', active = [true, true]) { return { algorithm, pc: active.map(a => a ? 0 : 6), flag: [false, false], victim: 0, localFlag: [false, false], steps: 0, message: '顺序一致、单个共享变量读写原子；每线程申请一次。' }; }
    function lockStep(state, i) {
        const s = clone(state), j = 1 - i, a = s.algorithm, p = s.pc[i];
        s.steps++;
        if (p === 6) {
            s.message = `线程 ${i} 本次不再申请。`;
            return s;
        }
        if (a === 'unsafe') {
            if (p === 0) {
                if (s.flag[j])
                    s.message = `T${i} 读到对方 flag=true，等待。`;
                else {
                    s.pc[i] = 1;
                    s.message = `T${i} 检查通过，但尚未设置自己的 flag。`;
                }
            }
            else if (p === 1) {
                s.flag[i] = true;
                s.pc[i] = 4;
                s.message = `T${i} 设置 flag 并进入临界区。`;
            }
        }
        else if (p === 0) {
            if (a === 'locktwo') {
                s.victim = i;
                s.pc[i] = 3;
                s.message = `T${i}: victim = ${i}`;
            }
            else {
                s.flag[i] = true;
                s.pc[i] = a === 'peterson' ? 1 : 2;
                s.message = `T${i}: flag[${i}] = true`;
            }
        }
        else if (a === 'peterson' && p === 1) {
            s.victim = i;
            s.pc[i] = 2;
            s.message = `T${i}: victim = ${i}`;
        }
        else if (p === 2) {
            s.localFlag[i] = s.flag[j];
            if (a === 'peterson') {
                s.pc[i] = s.localFlag[i] ? 3 : 4;
                s.message = `T${i} 读取 flag[${j}] = ${+s.localFlag[i]}`;
            }
            else {
                s.pc[i] = s.flag[j] ? 2 : 4;
                s.message = s.flag[j] ? `T${i} 等待对方放下 flag。` : `T${i} 进入临界区。`;
            }
        }
        else if (p === 3) {
            if (a === 'locktwo') {
                s.pc[i] = s.victim === i ? 3 : 4;
            }
            else
                s.pc[i] = s.victim === i ? 2 : 4;
            s.message = `T${i} 读取 victim = ${s.victim}，${s.pc[i] === 4 ? '进入临界区' : '继续等待'}。`;
        }
        if (p === 4) {
            s.pc[i] = 5;
            s.message = `T${i} 完成临界区内的有限工作。`;
        }
        if (p === 5) {
            if (a !== 'locktwo')
                s.flag[i] = false;
            s.pc[i] = 6;
            s.message = `T${i} 释放锁，本次申请结束。`;
        }
        return s;
    }
    function lockKey(s) { return JSON.stringify([s.pc, s.flag, s.victim, s.localFlag]); }
    function lockExplore(algorithm, active = [true, true]) { const start = lockInitial(algorithm, active), queue = [{ s: start, path: [] }], seen = new Set([lockKey(start)]); let bad = null, transitions = 0; for (let h = 0; h < queue.length; h++) {
        const { s, path } = queue[h];
        if (s.pc[0] === 4 && s.pc[1] === 4 && !bad)
            bad = { state: s, path };
        for (let i = 0; i < 2; i++) {
            const t = lockStep(s, i), k = lockKey(t);
            transitions++;
            if (!seen.has(k)) {
                seen.add(k);
                queue.push({ s: t, path: [...path, i] });
            }
        }
        check(queue.length < 50000, 'State search limit');
    } return { states: seen.size, transitions, bad }; }
    function lockStatus(s) { if (s.pc.filter(p => p === 4).length > 1)
        return 'violation'; if (s.pc.every(p => p === 6))
        return 'done'; if (s.algorithm === 'lockone' && s.pc.every(p => p === 2) && s.flag.every(Boolean))
        return 'deadlock'; if (s.algorithm === 'locktwo' && s.pc.some((p, i) => p === 3 && s.victim === i && s.pc[1 - i] === 6))
        return 'deadlock'; return s.pc.includes(4) ? 'critical' : 'running'; }
    return { clone, sum, range, bits, truth, cofactors, repair, repairSolutions, cubeMatches, cubeLiteral, cubeExpression, minimize, leaf, node, CELL_PATTERNS, mappingCase, matchPattern, mapTree, evalTree, hpwl, cliqueL1, starQuadratic, hanan, steiner, smoothSpan, linearSolve, anchors, optEdges, optEnergy, optStep, quadraticSolution, gradientError, rng, saEnergy, saStep, partitionNets, partitionCost, partitionEnumerate, gridCase, gridNeighbors, lee, codeDistance, retraceCodes, timingCase, topo, sta, cpuTime, cacheTrace, memoryPerf, amdahl, minProcessors, pipelineProgram, instructionText, pipelineInitial, pipelineStep, runPipeline, sequential, lockInitial, lockStep, lockExplore, lockStatus, lockKey };
});
