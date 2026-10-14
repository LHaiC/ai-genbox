"""Regenerate browser-readable data from public provenance JSON."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def value(name):return json.dumps(json.loads((ROOT/'sources'/name).read_text(encoding='utf-8')),ensure_ascii=False).replace('</','<\\/')
(ROOT/'src/source-data.js').write_text('window.SOURCE_DATA='+value('source-data.json')+';', encoding='utf-8')
(ROOT/'src/learning-data.js').write_text('\n'.join('window.'+var+'='+value(file)+';' for var,file in [('QUIZZES','quizzes.json'),('EQUATIONS','equations.json'),('COVERAGE','coverage.json')]), encoding='utf-8')
