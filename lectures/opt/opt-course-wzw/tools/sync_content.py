"""Synchronize editable JSON, browser data, formula index, plain-text lecture and counts."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
for fn,global_name in [('chapters','CHAPTERS'),('sources','SOURCES'),('coverage','COVERAGE'),('missing','MISSING'),('pages','CORPUS')]:
    p=R/'data'/f'{fn}.json'
    if p.exists():
        obj=json.loads(p.read_text());(R/'data'/f'{fn}.js').write_text(f'window.{global_name}='+json.dumps(obj,ensure_ascii=False,separators=(',',':'))+';')
C=json.loads((R/'data/chapters.json').read_text());forms=[];parts=['# 最优化 · 直觉、证明与实验\n\n资料出处：文再文老师最优化教材与课程网站；逐项地址见 source_manifest.csv。'];nproof=0;nsteps=0
for c in C:
    parts+=['## '+c['title'],*c['body'],'$$\n'+c['formula']+'\n$$'];forms.append({'chapter':c['id'],'kind':'main','latex':c['formula'],'refs':c['refs']})
    for j,p in enumerate([{**c['proof'],'steps':c['derivation']},*c.get('extraProofs',[])]):
        nproof+=1;parts+=['### '+p['title'],'假设：'+p['assumptions'],'直觉：'+p['idea']]
        for i,s in enumerate(p['steps']):
            nsteps+=1;parts+=['#### '+str(i+1)+'. '+s['title'],s['text'],'$$\n'+s['math']+'\n$$','图中观察：'+s['hint']];forms.append({'chapter':c['id'],'kind':'proof' if j==0 else 'supplement','proof':j,'step':i+1,'latex':s['math'],'refs':p.get('refs',c['refs'])})
(R/'data/lecture-text.md').write_text('\n\n'.join(parts));(R/'data/formula_index.json').write_text(json.dumps(forms,ensure_ascii=False,indent=2));(R/'data/edition.json').write_text(json.dumps({'chapters':len(C),'labs':sum(len(c['labs']) for c in C),'proofs':nproof,'proof_steps':nsteps,'formulas':len(forms)},ensure_ascii=False,indent=2))
print('Synchronized',len(C),'chapters,',nproof,'proofs,',nsteps,'steps.')
