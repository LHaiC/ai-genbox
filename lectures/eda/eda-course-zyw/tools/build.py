"""Build modular index and a completely offline single HTML. No dependencies."""
from pathlib import Path
import base64,json,re
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'src'
shell=(src/'shell.html').read_text(encoding='utf-8')
content=(src/'content.html').read_text(encoding='utf-8')
loose=[m.group(0)[:48] for m in re.finditer(r'\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)',content) if '<' in m.group(0)]
if loose:raise SystemExit('A literal < inside math is parsed as a tag and truncates the formula; write &lt;: '+repr(loose[:3]))
css=(src/'style.css').read_text(encoding='utf-8')
files=['vendor/katex.js','src/core.js','src/intuition-core.js','src/source-data.js','src/learning-data.js','src/app.js','src/pedagogy.js']
html=shell.replace('<!-- CONTENT -->',content)
(ROOT/'index.html').write_text(html.replace('<!-- STYLE -->','<link rel="stylesheet" href="src/style.css">').replace('<!-- SCRIPTS -->','\n'.join(f'<script src="{f}"></script>' for f in files)), encoding='utf-8')
image='data:image/png;base64,'+base64.b64encode((ROOT/'assets/tech-mapping.png').read_bytes()).decode()
scripts=[]
for f in files:
 text=(ROOT/f).read_text(encoding='utf-8')
 if f.endswith('source-data.js'):text=text.replace('assets/tech-mapping.png',image)
 # Raw closing-script sequences would terminate an HTML parser's script element.
 text=re.sub(r'</script',r'<\\/script',text,flags=re.I)
 scripts.append('<script>\n'+text+'\n</script>')
standalone=html.replace('<!-- STYLE -->','<style>\n'+css+'\n</style>').replace('<!-- SCRIPTS -->','\n'.join(scripts))
(ROOT/'EDA_交互讲义.html').write_text(standalone, encoding='utf-8')
print(f'Built modular index.html and single HTML ({len(standalone.encode()):,} bytes).')
