'use strict';
// Run from any directory: node path/to/tests/course.test.cjs
// --partial checks available parts while writers are still working.
// This is a structural/renderability and numerical regression audit, not a proof checker.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const partial = process.argv.includes('--partial');
const katexPath = fs.existsSync(path.join(root, 'assets/katex.min.js'))
  ? path.join(root, 'assets/katex.min.js')
  : path.join(root, '../optimization_reading_edition/assets/katex.min.js');
const katex = require(katexPath);
let assertions = 0, formulas = 0;
const errors = [], warnings = [], modules = [];
const check = (condition, message) => { assertions++; if (!condition) errors.push(message); };
const string = (v, loc, nonempty = true) => check(typeof v === 'string' && (!nonempty || v.trim().length > 0), `${loc}: expected ${nonempty ? 'nonempty ' : ''}string`);
const strings = (v, loc, min = 1) => {
  check(Array.isArray(v) && v.length >= min, `${loc}: expected array with at least ${min} entries`);
  if (Array.isArray(v)) v.forEach((s, i) => string(s, `${loc}[${i}]`));
};
const math = (tex, loc) => {
  if (typeof tex !== 'string' || !tex.trim()) return;
  formulas++;
  // KaTeX interprets an accidental doubled command slash as a valid line break.
  // Reject these outside matrix/alignment environments rather than accepting a false pass.
  const rowEnvs = new Set(['matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','smallmatrix','array','aligned','align','align*','alignedat','gathered','cases']);
  const stack = [];
  const tokens = /\\begin\{([^}]+)\}|\\end\{([^}]+)\}|\\{2,}/g;
  let token;
  while ((token = tokens.exec(tex))) {
    if (token[1]) stack.push(token[1]);
    else if (token[2]) stack.pop();
    else if (!stack.some(e => rowEnvs.has(e))) errors.push(`${loc}: doubled TeX backslash outside a row-based environment at ${token.index}`);
    else if (token[0].length === 2 && /^(?:operatorname|nabla|frac|tfrac|dfrac|mathbb|mathcal|lambda|theta|qquad|quad|Longrightarrow|Rightarrow|le|ge|succeq|preceq)\b/.test(tex.slice(tokens.lastIndex))) errors.push(`${loc}: likely doubled TeX command after row separator at ${token.index}`);
  }
  try { katex.renderToString(tex, { throwOnError: true, strict: 'error', trust: false, output: 'htmlAndMathml' }); }
  catch (err) { errors.push(`${loc}: KaTeX: ${err.message}`); }
};
function inspectStrings(v, loc) {
  if (typeof v === 'string') {
    // Inline and display TeX are accepted; proof.formula and symbols are tested separately.
    const re = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
    let m;
    while ((m = re.exec(v))) math(m[1] ?? m[2], `${loc}@${m.index}`);
    const stripped = v.replace(re, '');
    if (!/\.formula$/.test(loc)) check(!/\\{2,}[()[\]]/.test(v), `${loc}: doubled inline/display TeX delimiter`);
    check(!/\\[()[\]]/.test(stripped), `${loc}: unmatched TeX delimiter`);
    check(!/(?:file:\/\/|\/workspace\/|\/home\/agent\/|sandbox:|dream_notes|\/action_items\.md)/i.test(v), `${loc}: private/internal filesystem reference`);
    check(!/(?:保证|确保)(?:[^。；]{0,16})(?:一天|一日|掌握全书|精通)|一天(?:[^。；]{0,6})(?:精通|完全掌握)/.test(v), `${loc}: unsupported one-day mastery promise`);
  } else if (Array.isArray(v)) v.forEach((x, i) => inspectStrings(x, `${loc}[${i}]`));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => inspectStrings(x, `${loc}.${k}`));
}
const expected = { m1: 35, m2: 60, m3: 50, m4: 65, m5: 65, m6: 55, m7: 50, m8: 40 };
for (let n = 1; n <= 3; n++) {
  const file = path.join(root, `content/part${n}.json`);
  if (!fs.existsSync(file)) { if (!partial) errors.push(`Missing content/part${n}.json`); continue; }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    check(Array.isArray(data), `part${n}: top level must be an array`);
    if (Array.isArray(data)) modules.push(...data);
  } catch (e) { errors.push(`part${n}: ${e.message}`); }
}
const ids = new Set(), lessonIds = new Set(), sourceURLs = new Set(), animationIDs = new Set();
const allowedAnimations = new Set(['convex-chord', 'supporting-plane', 'projection', 'kkt', 'gradient', 'prox', 'newton', 'admm']);
for (const mod of modules) {
  const ml = mod.id || '(module without id)';
  check(!ids.has(mod.id), `${ml}: duplicate module id`); ids.add(mod.id);
  check(Object.hasOwn(expected, mod.id), `${ml}: unknown module id`);
  check(mod.minutes === expected[mod.id], `${ml}: minutes should equal ${expected[mod.id]}`);
  ['id','title','summary'].forEach(k => string(mod[k], `${ml}.${k}`));
  ['goals','prerequisites','takeaways'].forEach(k => strings(mod[k], `${ml}.${k}`, k === 'prerequisites' ? 0 : 1));
  check(Array.isArray(mod.lessons) && mod.lessons.length >= 4, `${ml}: must have at least 4 lessons`);
  for (const lesson of mod.lessons || []) {
    const loc = `${ml}.${lesson.id}`;
    check(!lessonIds.has(lesson.id), `${loc}: duplicate lesson id`); lessonIds.add(lesson.id);
    check(new RegExp(`^${mod.id}-l[1-9]\\d*$`).test(lesson.id), `${loc}: malformed lesson id`);
    ['id','title','intuition','formal'].forEach(k => string(lesson[k], `${loc}.${k}`));
    check(Array.isArray(lesson.symbols) && lesson.symbols.length >= 1, `${loc}.symbols: missing glossary`);
    for (const [i, s] of (lesson.symbols || []).entries()) {
      string(s.symbol, `${loc}.symbols[${i}].symbol`); string(s.meaning, `${loc}.symbols[${i}].meaning`);
      if (s.symbol && !/\\\(|\\\[/.test(s.symbol)) math(s.symbol, `${loc}.symbols[${i}].symbol`);
    }
    check(Array.isArray(lesson.proof) && lesson.proof.length >= 5 && lesson.proof.length <= 10, `${loc}.proof: expected 5–10 meaningful steps`);
    for (const [i, step] of (lesson.proof || []).entries()) {
      ['title','body','reason'].forEach(k => string(step[k], `${loc}.proof[${i}].${k}`));
      string(step.formula, `${loc}.proof[${i}].formula`, false);
      if (!/\\\(|\\\[/.test(step.formula || '')) math(step.formula, `${loc}.proof[${i}].formula`);
      else errors.push(`${loc}.proof[${i}].formula: use raw TeX without delimiters`);
    }
    check(lesson.example && typeof lesson.example === 'object', `${loc}.example: missing worked example`);
    if (lesson.example) {
      string(lesson.example.problem, `${loc}.example.problem`);
      strings(lesson.example.steps, `${loc}.example.steps`);
      string(lesson.example.answer, `${loc}.example.answer`);
    }
    strings(lesson.pitfalls, `${loc}.pitfalls`);
    check(Array.isArray(lesson.checks) && lesson.checks.length >= 1 && lesson.checks.length <= 2, `${loc}.checks: expected 1–2 retrieval checks`);
    for (const [i, c] of (lesson.checks || []).entries()) {
      string(c.question, `${loc}.checks[${i}].question`); string(c.answer, `${loc}.checks[${i}].answer`);
    }
    check(lesson.animation === null || allowedAnimations.has(lesson.animation), `${loc}.animation: missing/unknown animation key ${lesson.animation}`);
    if (lesson.animation) animationIDs.add(lesson.animation);
    check(lesson.source && typeof lesson.source === 'object', `${loc}.source: missing primary source`);
    if (lesson.source) {
      string(lesson.source.label, `${loc}.source.label`); string(lesson.source.url, `${loc}.source.url`);
      try {
        const u = new URL(lesson.source.url);
        check(u.protocol === 'https:', `${loc}.source.url: use HTTPS primary source`);
        check(/(^|\.)(pku\.edu\.cn|stanford\.edu)$/.test(u.hostname), `${loc}.source.url: source is outside expected primary-author domains`);
        sourceURLs.add(lesson.source.url);
      } catch { errors.push(`${loc}.source.url: invalid URL`); }
    }
    inspectStrings(lesson, loc);
  }
  for (const field of ['title','goals','prerequisites','summary','takeaways']) inspectStrings(mod[field], `${ml}.${field}`);
}
if (!partial) {
  check(modules.length === 8, 'Expected all 8 modules');
  check(Object.keys(expected).every(id => ids.has(id)), 'Expected m1 through m8');
  check(modules.reduce((s,m) => s + (m.minutes || 0),0) === 420, 'Main path must total 420 study minutes');
}
// Verify the actual offline reader receives the exact audited content, not a stale build.
if (!partial) {
  const bundle = path.join(root, 'content/course.js');
  check(fs.existsSync(bundle), 'Missing offline content/course.js bundle');
  if (fs.existsSync(bundle)) {
    try {
      const vm = require('node:vm'), context = { window: {} };
      vm.runInNewContext(fs.readFileSync(bundle, 'utf8'), context, { timeout: 1000 });
      check(JSON.stringify(context.window.CONVEX_COURSE) === JSON.stringify(modules), 'Offline content/course.js differs from audited JSON parts; rebuild the bundle');
    } catch (e) { errors.push(`Offline bundle load: ${e.message}`); }
  }
}
// Independent numerical reference checks. These do NOT certify every textual example.
let numericalAssertions = 0;
const near = (actual, expected, label, tol = 1e-11) => {
  numericalAssertions++;
  check(Math.abs(actual - expected) <= tol, `${label}: got ${actual}, expected ${expected}`);
};
const soft = (v, threshold) => Math.sign(v) * Math.max(Math.abs(v) - threshold, 0);
// One-dimensional constrained quadratic: min (x-2)^2/2, x <= 1.
near(1 - 2 + 1, 0, 'KKT stationarity x*=1, lambda*=1');
near(-.5 * 1 ** 2 + 1, .5, 'Constrained quadratic dual equals primal .5');
// Equality-constrained minimum norm: x1+x2=1.
near(.5 * (.5 ** 2 + .5 ** 2), .25, 'Minimum norm equality objective');
near(.5 + (-.5), 0, 'Minimum norm equality stationarity nu=-.5');
// L1 prox and Lasso with A=I: prox_{lambda ||.||1}(b).
near(soft(3, 1), 2, 'Soft threshold positive');
near(soft(-.5, 1), 0, 'Soft threshold dead zone');
near(soft(-3, 1), -2, 'Soft threshold negative');
// Conditioned quadratic with Hessian diag(1,10), alpha=1/10.
near(1 - .1 * 1, .9, 'Gradient low-curvature contraction');
near(1 - .1 * 10, 0, 'Gradient high-curvature contraction');
// Scalar log barrier: min t*x - log(x), x>0, optimum 1/t.
near(5 - 1 / .2, 0, 'Barrier stationarity t=5, x=.2');
near(1 / 5, .2, 'Single-inequality central-path gap m/t');
// Two-block ADMM: min (x-3)^2/2 + |z|, x=z, rho=1, z0=u0=0.
let z=0, u=0, x=0;
for (let k=0; k<100; k++) { x=(3+z-u)/2; z=soft(x+u,1); u=u+x-z; }
near(x,2,'ADMM converges in scalar reference'); near(z,2,'ADMM primal feasibility reference'); near(u,1,'ADMM scaled dual reference');
// Verify the same determinant formula that an ellipsoidal quadratic illustrates.
near(2*3-1*1,5,'Positive definite 2x2 Hessian determinant');
const result = {
  status: errors.length ? 'FAIL' : partial ? 'PARTIAL PASS' : 'PASS',
  generatedAt: new Date().toISOString(), katexVersion: katex.version,
  modules: modules.length, lessons: lessonIds.size, proofSteps: modules.reduce((s,m)=>s+(m.lessons||[]).reduce((t,l)=>t+(l.proof||[]).length,0),0),
  mainPathMinutes: modules.reduce((s,m)=>s+(m.minutes||0),0),
  renderedMathExpressions: formulas, assertions, numericalAssertions,
  sources: [...sourceURLs], usedAnimations: [...animationIDs], errors, warnings,
  limitations: ['Schema and KaTeX checks are exhaustive over loaded JSON.', 'Numerical tests validate the named independent reference calculations only.', 'Mathematical theorem validity, all example arithmetic, source support, prose originality, visual layout, and runtime interactions require separate review.']
};
fs.mkdirSync(path.join(root,'reports'), {recursive:true});
fs.writeFileSync(path.join(root,'reports/mechanical-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
process.exitCode = errors.length ? 1 : 0;
