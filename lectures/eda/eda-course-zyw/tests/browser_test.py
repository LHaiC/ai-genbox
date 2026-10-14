"""Real Chromium UI regression suite (Playwright sync, no remote assets).
Default: set_content executes the single-file HTML in a real browser DOM.
This environment's browser policy blocks file:// and localhost navigation.
Outside it, pass --url http://127.0.0.1:8000/index.html to test HTTP navigation.
"""
from pathlib import Path
import argparse, json, time, traceback, shutil, os, hashlib
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url');args=parser.parse_args()
results=[]; errors=[];console=[];requests=[];started=time.time();screens=[]

def test(name,fn):
 t=time.time()
 try:
  fn();results.append({'name':name,'passed':True,'ms':round((time.time()-t)*1000)})
 except Exception as e:
  results.append({'name':name,'passed':False,'ms':round((time.time()-t)*1000),'error':str(e),'trace':traceback.format_exc()});print('FAIL',name,str(e)[:300],flush=True)

def require(x,msg='assertion failed'):
 if not x:raise AssertionError(msg)

def close(a,b,tol=1e-8):require(abs(a-b)<=tol,f'{a} != {b}')

with sync_playwright() as pw:
 executable=os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome')
 launch={'headless':True,'args':['--no-sandbox']}
 if executable:launch['executable_path']=executable
 browser=pw.chromium.launch(**launch)
 page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',device_scale_factor=1)
 page.set_default_timeout(5000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 page.on('request',lambda r:requests.append(r.url))
 html=(ROOT/'EDA_交互讲义.html').read_text(encoding='utf-8')
 if args.url:page.goto(args.url,wait_until='load')
 else:page.set_content(html,wait_until='load')
 page.wait_for_function('window.__REVISION_READY')
 version=browser.version
 state=lambda lab:page.evaluate('(id)=>window.__LABS[id].getState()',lab)
 def choose(id,value):page.locator('#'+id).select_option(value)
 def slider(id,value):page.locator('#'+id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',str(value))
 def click(sel):page.locator(sel).click()
 def snapshot(name,selector=None):
  file='screenshots/'+name+'.png';(ROOT/'reports/screenshots').mkdir(parents=True,exist_ok=True)
  if selector:
   page.locator(selector).evaluate('(e)=>e.scrollIntoView({block:"start",behavior:"instant"})');page.evaluate('scrollBy(0,-85)')
  else:page.evaluate('scrollTo(0,0)')
  page.screenshot(path=str(ROOT/'reports'/file));screens.append(file)
 def no_errors():
  require(not errors,'page errors: '+str(errors));require(not console,'console errors: '+str(console));require(not page.evaluate('window.__APP_ERRORS'),'internal errors');require(page.locator('.katex-error').count()==0,'KaTeX errors')
 test('U01 · 单文件启动、24 实验、300+ 正文公式和零脚本错误',lambda:(require(page.evaluate('Object.keys(__LABS).length')==24),require(page.locator('main .katex').count()>=300),require(page.locator('.notice-error:not([hidden])').count()==0),no_errors()))
 def valid_ids():
  duplicates=page.evaluate('''()=>{let s=new Set(),d=[];document.querySelectorAll('[id]').forEach(x=>{if(s.has(x.id))d.push(x.id);s.add(x.id)});return d;}''');require(not duplicates,str(duplicates))
 test('U02 · 全局 DOM 标识唯一',valid_ids)
 generic=['repair','qm','mapping','sa','partition','optimizer','lee','sta','pipeline','cache','shannon','sharing','gates','multilevel','timingwindow','hierarchy','philosophers']
 for lab in generic:
  def roundtrip(lab=lab):
   initial=state(lab);click(f'#lab-{lab} [data-act=next]');after=state(lab);require(initial!=after)
   click(f'#lab-{lab} [data-act=back]');require(state(lab)==initial,'state backtracking mismatch')
   click(f'#lab-{lab} [data-act=next]');require(state(lab)==after,'replay mismatch')
   click(f'#lab-{lab} [data-act=finish]');require(page.locator(f'#lab-{lab} [data-act=next]').is_disabled())
   click(f'#lab-{lab} [data-act=back]');require(state(lab)==page.evaluate('(id)=>__LABS[id].getTrace().at(-2)',lab))
   click(f'#lab-{lab} [data-act=reset]');require(state(lab)==initial)
  test('U03 · '+lab+' 单步 / 完整回退 / 重放 / 末尾边界',roundtrip)
 def boolean():
  before=state('boolean');click('#lab-boolean [data-bit="0"]');require(state('boolean')['table'][0]==1-before['table'][0]);choose('bool-preset','quiz');choose('bool-variable','0');require(page.locator('#lab-boolean .bool-display').inner_text().find('8 / 8')>=0);click('#lab-boolean [data-input="0"]');choose('bool-preset','mux')
 test('U04 · 真值表编辑与函数 / 输入切换',boolean)
 def repair():
  click('#lab-repair [data-valid="6"]') if page.locator('#lab-repair [data-valid="6"]').count() else page.evaluate('__LABS.repair.setCursor(6)')
  require(all(r['ok'] for r in page.evaluate('__LABS.repair.getState().rows')))
 test('U05 · 修复实验的可达配置通过全部输入',repair)
 def wire():
  choose('wire-case','square');close(state('wire')['result']['steiner'],3)
  slider('wire-x',.35);close(state('wire')['pins'][0][0],.35)
  before=state('wire')['pins'][0];pin=page.locator('#lab-wire [data-pin="0"]');pin.scroll_into_view_if_needed();box=pin.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2+40,box['y']+box['height']/2+30,steps=5);page.mouse.up();require(state('wire')['pins'][0]!=before)
  choose('wire-case','square');page.locator('#wire-x').focus();page.keyboard.press('ArrowRight');close(state('wire')['pins'][0][0],.025)
 test('U06 · 引脚鼠标拖动、滑块及键盘替代控制',wire)
 def vectors():
  slider('vec-w',3);slider('vec-h',1);s=state('vectors');close(s['exact'],min(s['a'],s['b']));require(s['a']!=s['b'])
 test('U07 · 长度候选交叉与 Hanan 精确值一致',vectors)
 def lee():
  choose('lee-case','source');click('#lab-lee [data-act=finish]');require(state('lee')['phase']=='done');require(len(state('lee')['path'])==7)
  for mode in ['pair','mod3','parity']:choose('lee-code',mode);require(page.locator('#lab-lee .notice-error:not([hidden])').count()==0)
  choose('lee-case','sealed');click('#lab-lee [data-act=finish]');require(state('lee')['phase']=='unreachable')
  choose('lee-case','source');click('#lab-lee [data-cell="6"]');require(6 not in page.evaluate('__LABS.lee.getResult().config.blocked'));click('#lee-swap');require(page.evaluate('__LABS.lee.getResult().config.start')==14);choose('lee-code','full');choose('lee-case','source')
 test('U08 · Lee 改障碍、无解、交换端点与三种编码',lee)
 def sta():
  click('#lab-sta [data-act=finish]');base=page.evaluate('__LABS.sta.getResult()');slider('sta-period',1.7);click('#lab-sta [data-act=finish]');r=page.evaluate('__LABS.sta.getResult()');close(r['setupSlack'][-1]-base['setupSlack'][-1],.5);close(r['holdSlack'][0]['slack'],base['holdSlack'][0]['slack'])
 test('U09 · 时序图参数变化：setup 改变而 hold 不变',sta)
 def pipeline():
  choose('pipe-case','load');click('#lab-pipeline [data-act=finish]');require(state('pipeline')['memory']['4']==15)
  choose('pipe-case','branch');click('#lab-pipeline [data-act=finish]');s=state('pipeline');require(s['regs'][2]==7 and s['regs'][3]==0);require('一致' in page.locator('#lab-pipeline .lab-display').inner_text());click('#lab-pipeline [data-act=back]');click('#lab-pipeline [data-act=next]');require(state('pipeline')==s)
 test('U10 · 流水线真实寄存器 / 内存 / 分支冲刷和回退',pipeline)
 def cache():
  choose('cache-case','conflict');choose('cache-sets','4');choose('cache-ways','1');choose('cache-block','4');click('#lab-cache [data-act=finish]');require(state('cache')['misses']==8)
  choose('cache-ways','2');click('#lab-cache [data-act=finish]');require(state('cache')['misses']==2)
  old=state('cache');page.locator('#cache-addresses').fill('-1,2');require(page.locator('#lab-cache .notice-error').is_visible());require(state('cache')==old)
  page.locator('#cache-addresses').fill('0, 16, 0');require(page.locator('#lab-cache .notice-error').is_hidden());click('#lab-cache [data-act=finish]');click('#mem-import');close(state('memory')['options']['miss'],2/3)
 test('U11 · Cache 冲突、LRU、无效输入恢复与跨实验真实数据导入',cache)
 def amdahl():
  slider('amd-p',90);slider('amd-n',10);slider('amd-h',0);close(state('amdahl')['speedup'],100/19)
  slider('amd-h',10);choose('amd-mode','parallel');close(state('amdahl')['time'],.199);choose('amd-mode','baseline');close(state('amdahl')['time'],.28)
 test('U12 · Amdahl 两种开销分母的 UI 数值核验',amdahl)
 def locks():
  choose('lock-case','unsafe');choose('lock-active','both');initial=state('locks');click('#lock-example');require(state('locks')['pc']==[4,4]);last=state('locks');click('#lab-locks [data-lock=back]');click('#lab-locks [data-lock=next]');require(state('locks')==last)
  choose('lock-case','peterson');click('#lock-example');require(state('locks')['pc'].count(4)==1);click('#lab-locks [data-lock=back]');click('#lab-locks [data-thread="0"]');require(page.evaluate('__LABS.locks.getCursor()')==len(page.evaluate('__LABS.locks.getTrace()'))-1)
  choose('lock-case','locktwo');choose('lock-active','single');click('#lock-example');require(page.evaluate('EDA.lockStatus(__LABS.locks.getState())')=='deadlock')
 test('U13 · 手动线程交错、互斥反例、历史分叉与单线程永久等待',locks)
 def all_presets():
  ids=page.locator('.lab select').evaluate_all('(xs)=>xs.map(x=>x.id)');count=0
  for id in ids:
   options=page.locator('#'+id+' option').evaluate_all('(xs)=>xs.filter(x=>!x.disabled).map(x=>x.value)')
   for value in options:choose(id,value);count+=1
  require(page.locator('.notice-error:not([hidden])').count()==0);no_errors();return count
 test('U14 · 所有下拉预设逐一触发 input 事件',all_presets)
 def boundaries():
  descriptors=page.locator('.lab input[type=range]').evaluate_all('(xs)=>xs.map(x=>({id:x.id,min:x.min,max:x.max}))')
  for d in descriptors:
   for x in [d['min'],d['max']]:slider(d['id'],x)
  require(page.locator('.notice-error:not([hidden])').count()==0);no_errors()
 test('U15 · 全部滑块 min / max 边界与计算完整性',boundaries)
 def checks():
  for cb in page.locator('.lab input[type=checkbox]').all():cb.check();cb.uncheck();cb.check()
  no_errors()
 test('U16 · 所有开关两种状态',checks)
 def sources():
  missing=page.evaluate('''()=>[...document.querySelectorAll('a.ref[data-src]')].filter(a=>{const s=SOURCE_DATA.find(x=>x.id===a.dataset.src);return !s||(a.dataset.at&&!s.headings.some(h=>h.anchor===a.dataset.at));}).map(a=>a.outerHTML)''');require(not missing,'bad references: '+str(missing))
  refs=page.evaluate('SOURCE_DATA.map(s=>({id:s.id,headings:s.headings}))')
  for ref in refs:
   page.evaluate('(id)=>openCourseSource(id)',ref['id']);require(page.locator('#source-dialog').is_visible())
   require(page.locator('#source-body').inner_text().strip(),'empty source')
   for head in ref['headings']:
    if head['anchor']:require(page.locator('#source-body [data-original-anchor="'+head['anchor']+'"]').count()==1)
   no_errors();page.keyboard.press('Escape')
  first=page.locator('button.excerpt-mini[data-src="B"]').first;first.click();require(page.locator('#source-dialog').get_attribute('data-source')=='B');click('#close-source')
 test('U17 · 全部引用锚点、10 份原文面板与原公式排版',sources)
 def source_image():
  page.evaluate('openCourseSource("S","technology-mapping")');page.wait_for_function('document.querySelector("#source-body img").complete');require(page.locator('#source-body img').evaluate('(e)=>e.naturalWidth')>0);click('#close-source')
 test('U18 · 内嵌原始技术映射图可解码',source_image)
 def themes():
  old=page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor');click('#theme-toggle');new=page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor');require(old!=new);click('#theme-toggle')
  old=page.locator('body').evaluate('(e)=>getComputedStyle(e).fontSize');click('#font-toggle');new=page.locator('body').evaluate('(e)=>getComputedStyle(e).fontSize');require(old!=new);click('#font-toggle')
 test('U19 · 日夜模式与大字号真实样式切换',themes)
 def search():
  page.locator('#search').fill('Peterson');require(page.locator('#search-results a').count()>0);click('#search-results a:first-child');require(page.locator('#search-results').is_hidden());page.locator('#search').fill('')
 test('U20 · 概念检索与跳转',search)
 def layout(width,height):
  page.set_viewport_size({'width':width,'height':height});page.evaluate('document.body.classList.remove("menu-open")');page.evaluate('scrollTo(0,0)')
  require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'body overflow')
  broken=page.evaluate('''()=>[...document.querySelectorAll('main .lab, main .lab-ui, main .controls, main .prose')].filter(e=>{const r=e.getBoundingClientRect();return r.left < -1 || r.right>innerWidth+1}).map(e=>e.id||e.className)''');require(not broken,'offscreen containers: '+str(broken))
  require(page.evaluate('document.querySelector(".hero h1").getBoundingClientRect().width>0'))
 for w,h in [(1440,1000),(1024,768),(768,1024),(390,844),(320,740)]:test(f'U21 · {w}×{h} 响应式主容器无横向越界',lambda w=w,h=h:layout(w,h))
 def mobile():
  page.set_viewport_size({'width':390,'height':844});click('#menu-toggle');require(page.locator('.sidebar').is_visible());require(page.locator('#menu-toggle').get_attribute('aria-expanded')=='true');click('#toc a[href="#ch-routing"]');require(page.locator('.sidebar').is_hidden());require(page.locator('#menu-toggle').get_attribute('aria-expanded')=='false')
  choose('lee-case','source');click('#lab-lee [data-act=next]');require(page.evaluate('__LABS.lee.getCursor()')==1);click('#lab-lee [data-act=back]');require(page.evaluate('__LABS.lee.getCursor()')==0)
 test('U22 · 移动端目录开合、导航与实际交互',mobile)
 def large_mobile():
  click('#font-toggle');require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));click('#font-toggle')
 test('U23 · 移动端大字号不造成整页横向溢出',large_mobile)
 def valid_svg():
  bad=page.evaluate('''()=>[...document.querySelectorAll('svg [x],svg [y],svg [cx],svg [cy],svg [points],svg [d]')].filter(e=>[...e.attributes].some(a=> /(?:NaN|Infinity|undefined)/.test(a.value))).map(e=>e.outerHTML)''');require(not bad,str(bad))
 test('U24 · 所有实时 SVG 几何中无 NaN / Infinity / undefined',valid_svg)
 # Screenshots use readable representative states, not endpoint stress settings.
 page.set_viewport_size({'width':1440,'height':1000})
 snapshot('01-desktop-overview')
 choose('bool-preset','mux');snapshot('02-desktop-boolean','#lab-boolean')
 choose('wire-case','square');choose('wire-mode','steiner');snapshot('03-desktop-wire','#lab-wire')
 choose('lee-case','source');choose('lee-code','pair');click('#lab-lee [data-act=finish]');snapshot('04-desktop-routing','#lab-lee')
 choose('pipe-case','load');page.locator('#pipe-forward').check();page.locator('#pipe-unified').uncheck();click('#lab-pipeline [data-act=finish]');snapshot('05-desktop-pipeline','#lab-pipeline')
 page.set_viewport_size({'width':390,'height':844});snapshot('06-mobile-overview');choose('lee-case','source');snapshot('07-mobile-routing','#lab-lee')
 page.set_viewport_size({'width':1440,'height':1000});click('#theme-toggle');snapshot('08-dark-overview');click('#theme-toggle')
 test('U25 · 最终页面及控制台错误为零',no_errors)
 test('U26 · 单文件运行期间没有外部 HTTP(S) 请求',lambda:require(not [u for u in requests if u.startswith(('https://','http://')) and (not args.url or not u.startswith(args.url.rsplit('/',1)[0]))],str(requests)))
 browser.close()

report={'kind':'Playwright / Chromium browser regression','generatedAt':datetime.now(timezone.utc).isoformat(),'browser':version,'mode':'navigate '+args.url if args.url else 'set_content: full standalone HTML in real Chromium','inputSha256':hashlib.sha256(html.encode()).hexdigest(),'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'ms':round((time.time()-started)*1000),'consoleErrors':len(console)+len(errors),'console':console,'pageErrors':errors,'requests':requests,'screenshots':screens,'tests':results,'limits':['file:// 顶层导航探测返回 ERR_BLOCKED_BY_ADMINISTRATOR；本轮实际使用 set_content 载入完整单文件HTML。','不是绕过浏览器测试：JS、DOM、SVG、MathML、鼠标、键盘、布局、控制台均在真实 Chromium 中执行。','未验证 Firefox / Safari / 真实移动设备；未把 DevTools 视口测试称为设备实机测试。']}
(ROOT/'reports/browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8');print(f"{report['passed']} passed, {report['failed']} failed; {report['consoleErrors']} console/page errors; {report['ms']} ms",flush=True)
raise SystemExit(1 if report['failed'] else 0)
