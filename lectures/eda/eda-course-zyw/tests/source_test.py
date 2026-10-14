"""Coverage, canonical attribution, quiz preservation and neutral publication audit."""
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime,timezone
import json,hashlib,re,time
ROOT=Path(__file__).resolve().parents[1]; S=ROOT/'sources'; results=[];started=time.time()
def load(f):return json.loads((S/f).read_text(encoding='utf-8'))
def require(v,msg='assertion failed'):
 if not v:raise AssertionError(msg)
def test(name,fn):
 t=time.time()
 try:fn();results.append(dict(name=name,passed=True,ms=round((time.time()-t)*1000)))
 except Exception as e:results.append(dict(name=name,passed=False,error=str(e)));print('FAIL',name,e)
data=load('source-data.json');by={s['id']:s for s in data};heads={s['id']:{h['anchor'] for h in s['headings']}|{''} for s in data};quizzes=load('quizzes.json');equations=load('equations.json');coverage=load('coverage.json');blocks=load('block-coverage.json');manifest=load('manifest.json');raw=(ROOT/'src/content.html').read_text(encoding='utf-8');html=BeautifulSoup(raw,'html.parser');ids={x['id'] for x in html.select('[id]')}
def norm(t):return BeautifulSoup(t,'html.parser').get_text(' ',strip=True)
test('I01 · 10原始页面、8章、102标题、254内容块、127TeX、45题/21组',lambda:require([len(data),len(coverage),len(blocks),len(equations),len(quizzes),len({(q['source'],q['source_anchor']) for q in quizzes})]==[10,102,254,127,45,21]))
def snapshots():
 for s in data:
  require((S/(s['slug']+'.txt')).read_text(encoding='utf-8')==s['text'])
  snap=BeautifulSoup((S/(s['slug']+'.article.html')).read_text(encoding='utf-8'),'html.parser');require(snap.select_one('link[rel=canonical]')['href']==s['url'])
  require(s['html'].replace('assets/tech-mapping.png','../assets/tech-mapping.png') in str((S/(s['slug']+'.article.html')).read_text(encoding='utf-8')))
test('I02 · 所有公开章节全文、代码、原图和规范出处保留',snapshots)
def heading():
 for s in data:
  soup=BeautifulSoup(s['html'],'html.parser');hs=soup.find_all(['h1','h2','h3','h4','h5','h6']);require([h.get('id','') for h in hs]==[h['anchor'] for h in s['headings']])
 for c in coverage:
  require(c['anchor'] in heads[c['source']]);require(c['lesson_anchor'] in ids);require(c['original_url']==by[c['source']]['url']+('#'+c['anchor'] if c['anchor'] else ''))
test('I03 · 102标题逐一对正文与原始锚点映射',heading)
def content_blocks():
 actual=[]
 for s in data:
  soup=BeautifulSoup(s['html'],'html.parser');current=''
  for i,e in enumerate(soup.find_all(recursive=False)):
   if e.name in ['h1','h2','h3','h4','h5','h6']:current=e.get('id','')
   actual.append((s['id'],e.get('data-block',e.get('id',f'{s["id"]}-{i}')),hashlib.sha256(e.get_text(' ',strip=True).encode()).hexdigest()))
 require(actual==[(b['source'],b['block_id'],b['text_sha256']) for b in blocks]);require(all(b['lesson_anchor'] in ids for b in blocks));require(sum(b['source'] not in ['H','G'] for b in blocks)==236)
test('I04 · 254原文内容块指纹逐项吻合，236教学块全部有正文位置',content_blocks)
def formulas():
 for e in equations:
  s=by[e['source']];require(e['source_anchor'] in heads[e['source']]);require(e['original_page'] is None);a,b=('\\[','\\]') if e['display'] else ('\\(','\\)');require(s['text'][e['text_start']:e['text_end']]==a+e['latex']+b);require(e['lesson_anchor'] in ids);require(e['original_url'].startswith(s['url']+'#'))
 require(len(html.select('.formula-walk'))>=8)
test('I05 · 127TeX按全文偏移、锚点、符号解释位置复核，不伪造页码',formulas)
def quiz_preserve():
 for q in quizzes:
  source=BeautifulSoup(by[q['source']]['html'],'html.parser');heading=source.find(id=q['source_anchor']);require(heading is not None)
  following=[]
  for n in heading.next_siblings:
   if getattr(n,'name',None) in ['h1','h2','h3','h4','h5','h6']:break
   following.append(str(n))
  require(norm(q['question_html']) in norm(''.join(following)),q['id']+' lost original question')
  entry=html.find(id=q['id']);require(entry is not None);require(norm(str(entry.select_one('.quiz-question')))==norm(q['question_html']));require(norm(q['stem_html']) in norm(str(entry)));require(norm(q['answer_html']) in norm(str(entry.select_one('.quiz-answer'))));require(len(norm(q['answer_html']))>40);require(q['lesson_target'] in ids)
 require(len(html.select('.quiz-card'))==45)
test('I06 · 全45道原题/选项/题干保留，答案及实验跳转逐题存在',quiz_preserve)
def references():
 for e in html.select('[data-src]'):
  require(e['data-src'] in by);require(e.get('data-at','') in heads[e['data-src']])
  if e.name=='a':require(e.get('href','')==by[e['data-src']]['url']+('#'+e.get('data-at') if e.get('data-at') else ''))
 for q in quizzes:require(q['original_url']==by[q['source']]['url']+'#'+q['source_anchor'])
 require('original_path' not in json.dumps(data));require('原始出处' in raw)
test('I07 · 引用与题目索引均指向原课程URL，不使用文件库路径',references)
def dependencies():
 cs=load('concepts.json');d={c['id']:c for c in cs};seen=set();active=set()
 def visit(k):
  require(k not in active,'cycle');require(k in d)
  if k in seen:return
  active.add(k)
  for p in d[k]['depends_on']:visit(p)
  active.remove(k);seen.add(k)
 for c in cs:
  visit(c['id']);require(c['source_anchor'] in heads[c['source']]);require(not c['lesson_lab'] or 'lab-'+c['lesson_lab'] in ids)
 require(len(cs)==34 and len(load('algorithms.json'))==15)
test('I08 · 34概念依赖无环，15原算法记录来源可定位',dependencies)
def resources():
 page=BeautifulSoup((ROOT/'EDA_交互讲义.html').read_text(encoding='utf-8'),'html.parser');req=[]
 for e in page.select('script[src],link[href],img[src],iframe[src]'):
  u=e.get('src',e.get('href',''))
  if not u.startswith('data:'):req.append(u)
 require(not req,str(req));require(not [p for p in ROOT.rglob('*') if p.suffix in ['.woff','.woff2','.ttf','.otf']]);require((ROOT/'vendor/KATEX-LICENSE.txt').exists());require("output: 'mathml'" in (ROOT/'src/app.js').read_text(encoding='utf-8'))
test('I09 · 单文件无远程资源依赖，不分发字体，KaTeX许可完整',resources)
def privacy():
 forbidden=['/mnt/data','/home/oai','/home/','input_archive','original_path','用户提供','上传者','本地资料库','你的文件']
 files=list((ROOT/'src').glob('*'))+list(S.glob('*'))+list(ROOT.glob('*.md'))+list((ROOT/'tools').glob('*.py'))
 for p in files:
  if p.is_file():
   text=re.sub(r'https?://[^\s\"<>]+','',p.read_text(encoding='utf-8'));require(not [w for w in forbidden if w in text],p.name+' contains private provenance')
 for s in data:require(s['url'].startswith('https://eda.youwei.xyz/'))
test('I10 · 正文、数据和文档不含个人路径与交付对象信息',privacy)
def scope():
 require(len(html.select('figure.lab'))==24);require(manifest['labs']==24 and manifest['trace_players']==18);require(manifest['ui_text_px']==16 and manifest['body_text_px']==18);require(len(manifest['known_gaps'])==4);require('PPT' in raw or 'ppt' in raw);require('没有' in raw);require('教材' in raw)
test('I11 · 24图解与桌面阅读规范一致；缺少附件和原题歧义明确',scope)
def mathEscape():
 loose=[m.group(0)[:48] for m in re.finditer(r'\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)',raw) if '<' in m.group(0)]
 require(not loose,'a literal < inside math is parsed as a tag and truncates the formula: '+repr(loose[:3]))
test('I12 · 数学片段内的 < 已转义，HTML 解析器不会在公式中截断',mathEscape)
report=dict(kind='Canonical-source, coverage and publication audit',generatedAt=datetime.now(timezone.utc).isoformat(),passed=sum(t['passed'] for t in results),failed=sum(not t['passed'] for t in results),ms=round((time.time()-started)*1000),tests=results,limits=['映射与指纹测试证明范围和可追溯性，不等同于自动证明每段教学解释正确。','原公开网页无页码，以真实章节锚点定位；未取得的教材章节/PPT不计为已覆盖。'])
(ROOT/'reports').mkdir(parents=True,exist_ok=True);(ROOT/'reports/source-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8');print(f"{report['passed']} passed, {report['failed']} failed");raise SystemExit(bool(report['failed']))
