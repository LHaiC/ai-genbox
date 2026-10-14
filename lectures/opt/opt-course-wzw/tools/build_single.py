"""Bundle local scripts and styles into a no-network HTML. No font files embedded."""
from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
s=(r/'index.html').read_text()
s=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>\n'+(r/m[1]).read_text()+'\n</style>',s)
def inject(m):
 js=(r/m[1]).read_text();js=re.sub(r'</script',r'<\\/script',js,flags=re.I)
 return '<script>\n'+js+'\n</script>'
s=re.sub(r'<script src="([^"]+)"></script>',inject,s)
(r/'Optimization_Explorable.html').write_text(s)
print('Single HTML:',len(s.encode()),'bytes')
