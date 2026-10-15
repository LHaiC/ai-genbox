#!/usr/bin/env python3
"""Build the original offline course. No source PDFs, screenshots, or corpora are included."""
from pathlib import Path
import base64, hashlib, json, re, shutil, sys
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
OUTPUT = ROOT / 'Convex_Optimization_One_Day.html'

def main():
    modules = []
    for path in sorted((ROOT / 'content').glob('part[0-9]*.json')):
        modules.extend(json.loads(path.read_text(encoding='utf-8')))
    modules.sort(key=lambda m: int(m['id'][1:]))
    preview = '--preview' in sys.argv
    if not preview:
        assert [m['id'] for m in modules] == [f'm{i}' for i in range(1, 9)], 'Eight ordered modules are required'
        assert sum(m['minutes'] for m in modules) == 420, 'The main path must total 420 minutes'
    ids = []
    for m in modules:
        assert len(m['lessons']) >= 4, f"Too few lessons in {m['id']}"
        for l in m['lessons']:
            ids.append(l['id'])
            for key in ('id','title','intuition','formal','symbols','proof','example','pitfalls','checks','source'):
                assert l.get(key), f"Missing {key} in {l.get('id')}"
            assert len(l['proof']) >= 5, f"Proof needs at least five steps: {l['id']}"
            for p in l['proof']:
                assert all(p.get(k) for k in ('title','body','formula','reason')), f"Incomplete proof step in {l['id']}"
            assert l['source']['url'].startswith('https://'), f"Source link must be HTTPS: {l['id']}"
    assert len(ids) == len(set(ids)), 'Lesson identifiers must be unique'
    if not (ASSETS / 'katex.min.js').exists():
        source = ROOT.parent / 'optimization_reading_edition/assets/katex.min.js'
        assert source.exists(), 'Local KaTeX renderer missing'
        shutil.copy2(source, ASSETS / 'katex.min.js')
    license_source = ROOT.parent / 'optimization_reading_edition/assets/KATEX-LICENSE.txt'
    if license_source.exists():
        shutil.copy2(license_source, ASSETS / 'KATEX-LICENSE.txt')
    data = 'window.CONVEX_COURSE=' + json.dumps(modules, ensure_ascii=False, separators=(',', ':')).replace('</','<\\/') + ';\n'
    map_path = ROOT / 'content/formula-visual-map.json'
    visual_map = json.loads(map_path.read_text(encoding='utf-8')) if map_path.exists() else {'entries': [], 'lessons': []}
    compact_map = {'entries': [{key: entry[key] for key in ('lessonId','proofIndex','renderInline','defaultOpen','visualRole','exampleRelation') if key in entry} for entry in visual_map.get('entries', [])]}
    data += 'window.FORMULA_VISUAL_MAP=' + json.dumps(compact_map, ensure_ascii=False, separators=(',', ':')).replace('</','<\\/') + ';\n'
    (ROOT / 'content/course.js').write_text(data, encoding='utf-8')
    page = (ROOT / 'index.html').read_text(encoding='utf-8')
    embedded_fonts = set()
    def inline_css(match):
        path = ROOT / match.group(1)
        css = path.read_text(encoding='utf-8')
        if path.name == 'katex.min.css':
            # Modern browser target: keep WOFF2 only; do not inflate with duplicate font formats.
            css = re.sub(r'src:([^;}]+)', lambda m: 'src:' + next((s for s in m.group(1).split(',') if '.woff2' in s), m.group(1)), css)
        def inline_url(url_match):
            value = url_match.group(1).strip('"\' ')
            if value.startswith('data:') or value.startswith('#'):
                return url_match.group(0)
            font = (path.parent / value).resolve()
            assert font.is_file(), f'Missing CSS asset {font}'
            assert font.suffix == '.woff2', f'Unexpected embedded asset {font}'
            embedded_fonts.add(font.name)
            return 'url(data:font/woff2;base64,' + base64.b64encode(font.read_bytes()).decode() + ')'
        css = re.sub(r'url\(([^)]+)\)', inline_url, css)
        return '<style data-bundled="' + path.name + '">\n' + css.replace('</style','<\\/style') + '\n</style>'
    page = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, page)
    def inline_js(match):
        path = ROOT / match.group(1)
        text = path.read_text(encoding='utf-8').replace('</script', '<\\/script')
        return '<script data-bundled="' + path.name + '">\n' + text + '\n</script>'
    page = re.sub(r'<script src="([^"]+)"></script>', inline_js, page)
    license_text = (ASSETS / 'KATEX-LICENSE.txt').read_text(encoding='utf-8') if (ASSETS / 'KATEX-LICENSE.txt').exists() else 'KaTeX 0.16.27 — MIT License'
    page = page.replace('</head>', '<!-- KaTeX license:\n' + license_text.replace('--','—') + '\n-->\n</head>')
    three_license = ASSETS / 'THREE-LICENSE.txt'
    if three_license.exists():
        page = page.replace('</head>', '<!-- Three.js license:\n' + three_license.read_text(encoding='utf-8').replace('--', '—') + '\n-->\n</head>')
    assert not re.search(r'<(?:script[^>]+src|link[^>]+href)="(?!data:)', page), 'External executable/style dependency remains'
    assert '<iframe' not in page.split('function qaHarness')[0], 'No source iframe should be embedded'
    raw = page.encode('utf-8')
    assert len(raw) < 10_000_000, f'File too large: {len(raw)} bytes'
    OUTPUT.write_bytes(raw)
    report = {'output': OUTPUT.name, 'bytes': len(raw), 'megabytes': round(len(raw) / 1_000_000, 3), 'sha256': hashlib.sha256(raw).hexdigest(), 'modules': len(modules), 'lessons': len(ids), 'proof_steps': sum(len(l['proof']) for m in modules for l in m['lessons']), 'illustrated_lessons': len(visual_map.get('lessons', [])), 'inline_formula_figures': sum(e.get('renderInline', False) for e in visual_map.get('entries', [])), 'default_open_figures': sum(e.get('defaultOpen', False) for e in visual_map.get('entries', [])), 'three_formula_model_families': len(visual_map.get('lessons', [])), 'three_version': '0.186.1', 'study_minutes': sum(m['minutes'] for m in modules), 'break_minutes': 60, 'embedded_woff2_fonts': len(embedded_fonts), 'external_runtime_requests': 0, 'qa_harness': OUTPUT.name+'?qa=1'}
    (ROOT / 'reports').mkdir(exist_ok=True)
    (ROOT / 'reports/build.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
if __name__ == '__main__':
    main()
