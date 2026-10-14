"""Real-browser large-type, guided animation, quiz and canonical-index acceptance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from datetime import datetime,timezone
import os,shutil,json,hashlib,time,argparse
R=Path(__file__).resolve().parents[1];ap=argparse.ArgumentParser();ap.add_argument('--url');args=ap.parse_args();results=[];errors=[];console=[];requests=[];screens=[];beg=time.time();html=(R/'EDA_交互讲义.html').read_text(encoding='utf-8');audit={}
def require(x,m='assertion failed'):
 if not x:raise AssertionError(m)
def test(n,f):
 t=time.time()
 try:f();results.append(dict(name=n,passed=True,ms=round((time.time()-t)*1000)));print('PASS',n,flush=True)
 except Exception as e:results.append(dict(name=n,passed=False,error=str(e),ms=round((time.time()-t)*1000)));print('FAIL',n,str(e)[:350],flush=True)
with sync_playwright() as pw:
 opts=dict(headless=True,args=['--no-sandbox']);exe=os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome')
 if exe:opts['executable_path']=exe
 browser=pw.chromium.launch(**opts);version=browser.version;page=browser.new_page(viewport={'width':1440,'height':1100},reduced_motion='reduce');page.set_default_timeout(6000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:console.append(m.text) if m.type=='error' else None);page.on('request',lambda r:requests.append(r.url))
 if args.url:page.goto(args.url,wait_until='load')
 else:page.set_content(html,wait_until='load')
 page.wait_for_function('window.__REVISION_READY')
 def choose(i,v):page.locator('#'+i).select_option(str(v))
 def slider(i,v):page.locator('#'+i).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',str(v))
 def state(i):return page.evaluate('(i)=>__LABS[i].getState()',i)
 def cursor(i):return page.evaluate('(i)=>__LABS[i].getCursor()',i)
 def shot(name,selector=None):
  if selector:page.locator(selector).evaluate('(e)=>{scrollTo({top:scrollY+e.getBoundingClientRect().top-104,behavior:"instant"})}')
  else:page.evaluate('scrollTo({top:0,behavior:"instant"})')
  page.wait_for_timeout(120);file='screenshots/'+name+'.png';page.screenshot(path=str(R/'reports'/file));screens.append(file)
 def font_audit():
  expected=22 if page.locator('body').evaluate('(e)=>e.classList.contains("large-type")') else (17 if page.viewport_size['width']<=740 else 18)
  require(page.locator('body').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')==expected,'body font differs from reading specification')
  require(page.locator('button').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>=14,'controls must remain legible')
 def dimensions(w,large):
  page.set_viewport_size({'width':w,'height':1000})
  curr=page.locator('body').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')
  if (curr>18)!=large:page.locator('#font-toggle').click()
  require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'whole-page overflow')
  bad=page.evaluate('''()=>[...document.querySelectorAll('main .lab,main .lab-ui,main .prose,main .quiz-card,main .formula-walk')].filter(e=>{let r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1}).map(e=>e.id||e.className)''');require(not bad,str(bad[:8]));font_audit()
  audit[f'width{w}_large{large}']=page.locator('body').evaluate('(e)=>getComputedStyle(e).fontSize')
 for w in [1440,1024,768,390,320]:
  for large in [False,True]:test(f'V01 · {w}px / '+('放大' if large else '标准')+'：无整页溢出，桌面/手机字号符合阅读规范',lambda w=w,large=large:dimensions(w,large))
 page.set_viewport_size({'width':1440,'height':1100})
 if page.locator('body').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>18:page.locator('#font-toggle').click()
 def guides():
  require(page.locator('.intuition-guide').count()==24)
  for lab in page.evaluate('Object.keys(__LABS)'):
   texts=[]
   for i in range(3):
    page.locator(f'#lab-{lab} [data-guide="{i}"]').click();texts.append(page.locator(f'#lab-{lab} .guide-text').inner_text());require(page.locator(f'#lab-{lab} [aria-selected="true"]').count()==1)
   require(len(set(texts))==3)
 test('V02 · 24图解的72段预测/观察/原因引导可切换',guides)
 players=page.evaluate('Object.keys(__PLAYERS)');require(len(players)==18)
 for lab in players:
  def play(lab=lab):
   choose('speed-'+lab,350)
   page.locator(f'#lab-{lab} [data-rewind]').click()
   page.locator(f'#lab-{lab} [data-play]').click();page.wait_for_function('(id)=>__LABS[id].getCursor()>0',arg=lab,timeout=4000)
   page.evaluate('(id)=>__PLAYERS[id].stop()',lab);current=state(lab);step=cursor(lab);page.wait_for_timeout(420);require(state(lab)==current,'pause drift')
   page.evaluate('(id)=>__LABS[id].setCursor(__LABS[id].getCursor()-1)',lab);page.evaluate('(id)=>__LABS[id].setCursor(__LABS[id].getCursor()+1)',lab);require(state(lab)==current,'replay diverged')
   page.locator(f'#lab-{lab} [data-rewind]').click();require(cursor(lab)==0);require('0 /' in page.locator(f'#lab-{lab} .autoplay-status').inner_text());require(page.locator(f'#lab-{lab} [data-play]').get_attribute('aria-pressed')=='false')
  test(f'V03 · {lab} 真实播放/暂停/历史回退/重放/回到起点',play)
 def exclusive():
  page.evaluate('__PLAYERS.shannon.start();__PLAYERS.sharing.start()');require(page.evaluate('Object.values(__PLAYERS).filter(p=>p.isPlaying()).length')==1);require(page.evaluate('__PLAYERS.sharing.isPlaying()'));choose('share-a',0);require(not page.evaluate('__PLAYERS.sharing.isPlaying()'));require(cursor('sharing')==0)
 test('V04 · 播放器互斥与修改参数立即暂停并重算',exclusive)
 def quiz():
  require(page.locator('.quiz-card').count()==45);require(page.locator('.quiz-answer:not([hidden])').count()==45)
  for q in page.locator('.quiz-mode').all():
   q.click();require(q.get_attribute('aria-pressed')=='true');q.click();require(q.get_attribute('aria-pressed')=='false')
  require(page.locator('.quiz-answer:not([hidden])').count()==45)
  page.locator('#quizzes-x .quiz-mode').click();page.locator('#quiz-index-list a[href="#quiz-x-q-2"]').click();require(page.locator('#quiz-x-q-2 .quiz-answer').is_visible());page.locator('#quizzes-x .quiz-mode').click()
 test('V05 · 全45题默认展开、8章自测与索引自动展开目标答案',quiz)
 def presets():
  links=page.locator('.quiz-card [data-preset]').all();require(len(links)==45)
  for link in links:link.click()
  require(not page.locator('.notice-error:not([hidden])').count());require(not page.evaluate('__APP_ERRORS'))
 test('V06 · 45题对应图解链接与关联案例逐一可用',presets)
 def formulas():
  for e in page.locator('.formula-index-group').all():e.evaluate('(e)=>e.open=true')
  require(page.locator('.formula-entry').count()==127);require(page.locator('.formula-entry math').count()==127);require(page.locator('.formula-walk').count()>=8);font_audit()
  for w in [390,320]:
   page.set_viewport_size({'width':w,'height':900});font_audit();require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  for e in page.locator('.formula-index-group').all():e.evaluate('(e)=>e.open=false')
  page.set_viewport_size({'width':1440,'height':1100})
 test('V07 · 127原式全部展开无渲染错误，公式保持正常数学排版',formulas)
 def originals():
  bad=page.evaluate('''()=>[...document.querySelectorAll('a.ref,#source-catalog a.source-link,.quiz-source>a,#quiz-index-list a[target],#formula-index-list a[target],#coverage-index-list a[target]')].filter(a=>!a.href.startsWith('https://eda.youwei.xyz/')).map(a=>a.outerHTML)''');require(not bad,str(bad[:5]));require(page.locator('#coverage-index-list .index-entry').count()==102)
  for s in page.evaluate('SOURCE_DATA.map(s=>s.id)'):
   page.evaluate('(s)=>openCourseSource(s)',s);font_audit();require(page.locator('#source-dialog').is_visible());page.keyboard.press('Escape')
  require(page.evaluate('''()=>[...document.querySelectorAll('a.ref')].every(a=>a.target==='_blank')'''))
 test('V08 · Quiz/公式/资料索引均为原始出处；10份摘录独立呈现',originals)
 def new_numbers():
  slider('share-and',3);slider('share-or',3);slider('share-oa',4);page.evaluate('__LABS.sharing.setCursor(3)');require(state('sharing')['shared']==9 and state('sharing')['compound']==8)
  choose('gate-kind','AOI22');page.evaluate('__LABS.gates.setCursor(99)');require(state('gates')['output']==state('gates')['expected'])
  for mode in ['pairs','chain','cross']:
   choose('multi-case',mode);page.evaluate('__LABS.multilevel.setCursor(99)');s=state('multilevel');require(len(s['nodes'])==8 and sum(e['w'] for e in s['edges'])+s['internal']==s['totalWeight'])
  for mode in ['left','ordered','fifo']:
   choose('phil-mode',mode);page.evaluate('__LABS.philosophers.setCursor(999)');s=state('philosophers');require(s['deadlock'] if mode=='left' else sum(s['meals'])==5)
  choose('hier-hit',0);page.evaluate('__LABS.hierarchy.setCursor(99)');require(state('hierarchy')['total']==1)
 test('V09 · 新图解的浏览器终态与成本/边权/死锁/访问模型吻合',new_numbers)
 def reduced():
  page.emulate_media(reduced_motion='reduce');page.evaluate('__LABS.multilevel.setCursor(0);__LABS.multilevel.setCursor(1)');require(page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0)
  page.emulate_media(reduced_motion='no-preference');page.evaluate('__LABS.multilevel.setCursor(1);__LABS.multilevel.setCursor(2)');require(page.evaluate('document.getAnimations().length')>0);page.wait_for_timeout(500);page.emulate_media(reduced_motion='reduce')
 test('V10 · 减少动态偏好禁用补间，正常模式实际创建状态转场',reduced)
 def privacy():
  text=page.locator('body').inner_text();require(not any(s in text for s in ['用户提供','上传者','本地资料库','/mnt/data','/home/','你的文件']))
  require('localStorage.' not in (R/'src/app.js').read_text(encoding='utf-8'))
 test('V11 · 阅读界面无个人路径/交付对象信息，无持久化个人数据',privacy)
 def pan_state():
  page.set_viewport_size({'width':390,'height':900})
  choose('sh-a',1)
  pane=page.locator('#lab-shannon .diagram-scroll');pane.evaluate('(e)=>e.scrollLeft=250');before=pane.evaluate('(e)=>e.scrollLeft')
  require(before>0)
  page.locator('#lab-shannon [data-act=next]').click();require(page.locator('#lab-shannon .diagram-scroll').evaluate('(e)=>e.scrollLeft')==before)
  page.locator('#lab-shannon [data-act=back]').click();require(page.locator('#lab-shannon .diagram-scroll').evaluate('(e)=>e.scrollLeft')==before)
  page.set_viewport_size({'width':1440,'height':1100})
 test('V14 · 窄屏图解横向查看位置在单步/回退后保留',pan_state)
 def zero():require(not errors and not console and not page.evaluate('__APP_ERRORS'),str(errors+console));require(page.locator('.katex-error').count()==0);require(not [u for u in requests if u.startswith(('https://','http://')) and (not args.url or not u.startswith(args.url.rsplit('/',1)[0]))],str(requests))
 test('V12 · 零控制台异常、零KaTeX错误、零远程运行资源请求',zero)
 page.set_viewport_size({'width':1440,'height':1100});shot('09-revised-overview')
 choose('sh-a',1);choose('sh-b',0);page.evaluate('__LABS.shannon.setCursor(2)');shot('10-shannon-tree','#lab-shannon .lab-display')
 page.evaluate('__LABS.sharing.setCursor(3)');shot('11-sharing-cost','#lab-sharing .lab-display')
 choose('gate-kind','AOI21');page.evaluate('__LABS.gates.setCursor(99)');shot('12-gate-tree','#lab-gates .lab-display')
 shot('13-quiz-derivation','#quiz-x-q-2');shot('14-formula-walk','#memory-formulas')
 choose('phil-mode','left');page.evaluate('__LABS.philosophers.setCursor(999)');shot('15-resource-deadlock','#lab-philosophers .lab-display')
 page.set_viewport_size({'width':390,'height':844});shot('16-mobile-large-overview');shot('17-mobile-quiz','#quiz-x-q-2');shot('18-mobile-diagram','#lab-shannon .lab-display')
 test('V13 · 截图后仍无运行异常',zero)
 browser.close()
report=dict(kind='Large-type, animation and quiz browser acceptance',browser=version,mode='navigate '+args.url if args.url else 'set_content full standalone HTML',generatedAt=datetime.now(timezone.utc).isoformat(),inputSha256=hashlib.sha256(html.encode()).hexdigest(),passed=sum(t['passed'] for t in results),failed=sum(not t['passed'] for t in results),ms=round((time.time()-beg)*1000),consoleErrors=len(console)+len(errors),tests=results,audit=audit,screenshots=screens,limits=['正文默认18px，手机17px，放大模式22px；上下标采用正常数学比例。','原始位图作为出处证据保留；主要算法图解已另用大字SVG重绘。','视口模拟不等于实机测试；未验证Safari/Firefox。'])
(R/'reports/revision-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8');print(f"{report['passed']} passed, {report['failed']} failed; {report['consoleErrors']} errors; {report['ms']} ms",flush=True);raise SystemExit(bool(report['failed']))
