"""Chromium automation for the large-type proof edition.
No browser policy is changed. The exact self-contained document and source entry are
rendered independently. Restricted file navigation is recorded, not counted as tested.
"""
from pathlib import Path
import datetime,json,os,re,sys,time
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'reports';SHOTS=OUT/'screenshots';SHOTS.mkdir(exist_ok=True)
C=json.loads((R/'data/chapters.json').read_text());results=[];errors=[];console=[];requests=[];t0=time.perf_counter();navigation={}
def ensure(v,msg='assertion failed'):
 if not v:raise AssertionError(msg)
def record(name,fn):
 t=time.perf_counter()
 try:detail=fn();results.append({'name':name,'status':'pass','seconds':round(time.perf_counter()-t,3),'details':detail})
 except Exception as e:
  msg=str(e).replace(str(R),'<project>');results.append({'name':name,'status':'fail','error':msg});print('FAIL',name,msg[:400],flush=True)
def route(id):
 page.evaluate('(id)=>{history.replaceState(null,"","#"+id);App.route()}',id)
def click(loc):
 loc.evaluate("el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})");loc.click()
def snapshot(n):return page.evaluate('(n)=>JSON.stringify(Labs.get(n).history[Labs.get(n).cursor])',n)
def overflow():
 z=page.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})');ensure(max(z['document'],z['body'])<=z['width']+1,str(z));return z
FONT_JS=r'''() => {
 const records=[...document.querySelectorAll('body *')].filter(e=>{
 const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!['SCRIPT','STYLE','NOSCRIPT','TITLE'].includes(e.tagName)&&!e.closest('annotation,annotation-xml');
 }).map(e=>({tag:e.tagName,text:e.textContent.slice(0,70),size:parseFloat(getComputedStyle(e).fontSize)*(e instanceof SVGTextElement?e.getScreenCTM().a:1)}));
 return {minimum:Math.min(...records.map(r=>r.size)),checked:records.length,small:records.filter(r=>r.size<21.9)};
}'''
def typography():
 q=page.evaluate(FONT_JS);ensure(not q['small'],json.dumps(q['small'][:12],ensure_ascii=False));return {'minimum_px':round(q['minimum'],3),'text_nodes':q['checked'],'overflow':overflow()}
def capture(name,loc=None):
 if loc is not None:loc.evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})");page.evaluate('scrollBy(0,-95)')
 else:page.evaluate('scrollTo(0,0)')
 page.screenshot(path=str(SHOTS/name),full_page=False,animations="disabled")
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1080},accept_downloads=True)
 probe=ctx.new_page()
 try:
  probe.goto((R/'Optimization_Explorable.html').as_uri(),timeout=5000);probe.wait_for_function('window.__ready===true',timeout=2000);navigation={'file_navigation':'passed'}
 except Exception as e:
  navigation={'file_navigation':'not_verified','reason':'Browser administrator policy blocked file navigation' if 'BLOCKED_BY_ADMINISTRATOR' in str(e) else str(e).splitlines()[0].replace(str(R),'<project>')}
 probe.close()
 page=ctx.new_page();page.set_default_timeout(6000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:console.append(e.text) if e.type=='error' else None);page.on('request',lambda r:requests.append(r.url))
 page.set_content((R/'Optimization_Explorable.html').read_text());page.wait_for_function('window.__ready===true')
 record('Self-contained entry renders both proof figure and algorithm experiment',lambda:ensure(page.locator('h1').count()==1 and page.locator('.proof-panel').count()==1 and page.locator('math').count()>0))
 capture('home-desktop.png')
 for c in C:
  route(c['id'])
  def chapter_structure():
   expected=1+len(c.get('extraProofs',[]));ensure(page.locator('.proof-panel').count()==expected)
   total=len(c['derivation'])+sum(len(p['steps']) for p in c.get('extraProofs',[]));ensure(page.locator('[data-proof-index]').count()==total)
   ensure(page.locator('math').count()==total+1);ensure(page.locator('.katex-error').count()==0)
   ensure(page.locator('[data-proof-index]').evaluate_all("els=>els.every(e=>getComputedStyle(e).display!=='none')"))
   click(page.locator('.answer-toggle'));ensure(page.locator('.answer').is_visible());click(page.locator('.answer-toggle'));ensure(not page.locator('.answer').is_visible())
   return {'proofs':expected,'visible_steps':total,'formula_count':total+1}
  record('Complete proof and question / '+c['id'],chapter_structure)
  for j in range(1+len(c.get('extraProofs',[]))):
   key=c['id']+'-proof-'+str(j);node=page.locator('#'+key)
   def proof_interaction():
    before=page.evaluate('(id)=>ProofViews.get(id).value',key);defs=page.evaluate('(id)=>{const d=ProofViews.get(id).def;return {min:d.min,max:d.max,value:d.value,step:d.step,discrete:!!d.discrete}}',key)
    slider=node.locator('.intuition-slider');slider.evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',defs['min']);minstate=page.evaluate('(id)=>JSON.stringify(ProofViews.get(id).result.metrics)',key)
    slider.evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',defs['max']);ensure(abs(page.evaluate('(id)=>ProofViews.get(id).value',key)-defs['max'])<1e-8)
    click(node.locator('[data-figure=back]'));ensure(page.evaluate('(id)=>JSON.stringify(ProofViews.get(id).result.metrics)',key)==minstate,'figure rollback mismatch')
    click(node.locator('[data-figure=reset]'));ensure(abs(page.evaluate('(id)=>ProofViews.get(id).value',key)-defs['value'])<1e-8)
    # Playback starts with a real click; pause must stop value changes.
    slider.evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',defs['min'])
    click(node.locator('[data-figure=play]'));page.wait_for_timeout(610 if defs['discrete'] else 220)
    value=page.evaluate('(id)=>ProofViews.get(id).value',key);ensure(value>defs['min'],'figure timer did not advance')
    if page.evaluate('(id)=>!!ProofViews.get(id).timer',key):click(node.locator('[data-figure=play]'))
    value=page.evaluate('(id)=>ProofViews.get(id).value',key);page.wait_for_timeout(185);ensure(page.evaluate('(id)=>ProofViews.get(id).value',key)==value,'pause failed')
    # Proof reading and numerical state are independent.
    click(node.locator('[data-proof-action=next]'));ensure(page.evaluate('(id)=>ProofViews.get(id).focus',key)==1)
    click(node.locator('[data-proof-action=back]'));ensure(page.evaluate('(id)=>ProofViews.get(id).focus',key)==0)
    count=node.locator('[data-proof-index]').count();node.locator('.proof-select').select_option(str(count-1));ensure(node.locator('.focused').count()==1)
    click(node.locator('[data-proof-action=all]'));ensure(node.locator('[data-proof-index]').count()==count and node.locator('.focused').count()==0)
    ensure(page.evaluate('__uiErrors.length+__mathErrors.length')==0)
    return {'steps':count,'figure_min':defs['min'],'figure_max':defs['max'],'timer_advanced':True,'rollback_exact':True}
   record('Proof navigation, figure slider, animation and rollback / '+key,proof_interaction)
  for l in c['labs']:
   n=l['id'];node=page.locator('#lab-'+n)
   def lab_interaction():
    ensure(node.locator('.plot svg').count()==1);stepping=page.evaluate('(n)=>!!OptExperiments.registry[n].step',n)
    if stepping:
     z=snapshot(n);click(node.locator('[data-action=step]'));one=snapshot(n);ensure(one!=z);click(node.locator('[data-action=back]'));ensure(snapshot(n)==z);click(node.locator('[data-action=step]'));ensure(snapshot(n)==one)
     click(node.locator('[data-action=ten]'));ensure(page.evaluate('(n)=>Labs.get(n).cursor',n)>=1)
     node.locator('[data-action=seek]').evaluate("e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))}");ensure(snapshot(n)==z);click(node.locator('[data-action=reset]'));ensure(snapshot(n)==z)
    controls=page.evaluate('(n)=>OptExperiments.registry[n].controls',n)
    for ctl in controls:
     if ctl['type']=='select':
      for value,_ in ctl['items']:node.locator('[data-param="'+ctl['key']+'"]').select_option(str(value));ensure(page.evaluate('(n)=>Labs.get(n).cursor',n)==0)
      node.locator('[data-param="'+ctl['key']+'"]').select_option(str(ctl['value']))
     else:
      num=node.locator('[data-number="'+ctl['key']+'"]')
      for value in [ctl['min'],ctl['max'],ctl['value']]:num.fill(str(value));num.dispatch_event('change');ensure(abs(page.evaluate('(a)=>Labs.get(a[0]).params[a[1]]',[n,ctl['key']])-value)<1e-8)
    ensure(page.evaluate('__uiErrors.length')==0)
    return {'controls':len(controls),'step_and_exact_rollback':stepping}
   record('Algorithm controls, cases, history and reset / '+n,lab_interaction)
 # Typography includes actual SVG scale and MathML scripted glyphs, not just body CSS.
 for w,h in [(360,900),(390,844),(768,1024),(1440,1080),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h})
  for c in C:route(c['id']);record(f'Large type and responsive {w}px / '+c['id'],typography)
  for id in ['map','library','coverage']:route(id);record(f'Large type and responsive {w}px / '+id,typography)
 page.set_viewport_size({'width':390,'height':844});route('convex');capture('convex-mobile.png',page.locator('.intuition .plot'));capture('proof-mobile.png',page.locator('.derive-step').nth(2))
 def navigation_mobile():
  click(page.locator('#menu'));ensure(page.locator('#menu').get_attribute('aria-expanded')=='true');click(page.locator('#chapter-nav a[data-id="admm"]'));page.wait_for_function('location.hash==="#admm" && document.querySelector("#lab-admm") && document.querySelector("#menu").getAttribute("aria-expanded")==="false"');ensure(page.locator('#lab-admm').count()==1,'destination experiment missing');ensure(page.locator('#menu').get_attribute('aria-expanded')=='false','drawer did not close')
 record('Mobile drawer navigation',navigation_mobile)
 page.set_viewport_size({'width':1440,'height':1080});route('acceleration');capture('fista-energy-desktop.png',page.locator('.intuition .plot'));capture('fista-proof-desktop.png',page.locator('.derive-step').nth(4))
 route('admm');capture('admm-energy-desktop.png',page.locator('.intuition .plot').nth(1))
 def automatic_stop():
  node=page.locator('#admm-proof-1');page.evaluate('()=>{const v=ProofViews.get("admm-proof-1");v.set(v.def.max-1)}');click(node.locator('[data-figure=play]'));page.wait_for_timeout(650);ensure(not page.evaluate('ProofViews.get("admm-proof-1").timer'))
  old=page.evaluate('()=>{const v=ProofViews.get("admm-proof-0");v.playFigure();window.__oldProof=v;return v.value}');route('convex');ensure(page.evaluate('window.__oldProof.timer===null&&window.__oldProof.guideTimer===null'))
 record('Animation terminal state and chapter change stop timers',automatic_stop)
 route('convex')
 def proof_guide():
  node=page.locator('.proof-panel').first;click(node.locator('[data-proof-action=play]'));page.wait_for_timeout(2920);ensure(page.evaluate('ProofViews.get("convex-proof-0").focus')==1);click(node.locator('[data-proof-action=play]'));ensure(page.evaluate('ProofViews.get("convex-proof-0").guideTimer===null'))
 record('Proof-reading timer advances and pauses',proof_guide)
 route('gradient')
 def export():
  node=page.locator('#lab-gradient');click(node.locator('[data-action=ten]'));click(node.locator('.state-details>summary'))
  with page.expect_download() as info:click(node.locator('[data-action=json]'))
  info.value.save_as(OUT/'trace.json');data=json.loads((OUT/'trace.json').read_text());ensure(len(data['history'])==11 and data['input']['problem']['Q'])
  with page.expect_download() as info:click(node.locator('[data-action=csv]'))
  info.value.save_as(OUT/'trace.csv');ensure('state' in (OUT/'trace.csv').read_text());return {'actual_downloads':2,'states':11}
 record('Actual JSON and CSV export',export)
 route('stochastic')
 def source_reader():
  click(page.locator('.refs button[data-source="s064"]'));ensure(page.locator('#reader').is_visible());ensure(page.locator('#reader-page').input_value()=='514');ensure('496' in page.locator('#reader-label').inner_text());ensure('文再文' in page.locator('#reader-origin').inner_text())
  ensure(page.locator('#original-link').get_attribute('href').startswith('https://faculty.bicmr.pku.edu.cn/'));ensure('#page=514' in page.locator('#original-link').get_attribute('href'));ensure('source/site/' in page.locator('#archive-link').get_attribute('href'))
  click(page.locator('#reader-next'));ensure(page.locator('#reader-page').input_value()=='515');typography();capture('source-reader-desktop.png');page.keyboard.press('Escape');ensure(not page.locator('#reader').is_visible());page.evaluate('App.openSource("s001",1)');ensure(not page.locator('#original-link').is_visible(),'metadata must not claim an original website page');ensure('编排附表' in page.locator('#reader-origin').inner_text());page.keyboard.press('Escape')
 record('Original website attribution, physical/printed pages and source reader',source_reader)
 route('library')
 def source_library():
  ensure(page.locator('#library-results tbody tr').count()==65);ensure(page.locator('#library-results a[href^="http"]').count()==64);ensure('文再文' in page.locator('.origin-banner').inner_text())
  page.locator('#library-mode').select_option('full');page.locator('#library-search').fill('Armijo');page.wait_for_timeout(320);ensure(page.locator('.search-result').count()>0);click(page.locator('.search-result button').first);ensure(page.locator('#reader').is_visible());page.keyboard.press('Escape')
 record('All 65 records, 64 public-source links, corpus search',source_library)
 route('library');capture('library-desktop.png')
 route('coverage')
 def coverage():
  ensure(page.locator('.toc-list li').count()==266);page.locator('#toc-search').fill('半光滑');ensure(0<page.locator('.toc-list li').count()<266)
 record('266 textbook section references and filtering',coverage)
 route('map');record('Readable dependency graph and complete accessible alternative',lambda:ensure(page.locator('.map-svg a').count()==34 and page.locator('.concept-node').count()==34))
 route('convex')
 def theme_font():
  click(page.locator('#theme'));ensure(page.evaluate('document.documentElement.dataset.theme')=='dark');capture('dark-desktop.png');click(page.locator('#theme'))
  for i in range(3):click(page.locator('#font'));typography()
 record('Larger font modes and dark/light themes',theme_font)
 def reduced_motion():
  page.emulate_media(reduced_motion='reduce');route('acceleration');ensure(page.evaluate('matchMedia("(prefers-reduced-motion:reduce)").matches'));ensure(page.evaluate('[...ProofViews.values()].every(v=>!v.timer&&!v.guideTimer)'));ensure(page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')=='auto');page.emulate_media(reduced_motion='no-preference')
 record('Reduced-motion preference respected; no autoplay',reduced_motion)
 def source_entry():
  p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));s=(R/'index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"></script>',s);s=re.sub(r'<script src="[^"]+"></script>','',s);s=re.sub(r'<link rel="stylesheet" href="[^"]+">','',s);p.set_content(s);p.add_style_tag(path=str(R/'assets/style.css'))
  for src in scripts:p.add_script_tag(path=str(R/src))
  p.wait_for_function('window.__ready===true');ensure(p.locator('.proof-panel').count()==1 and p.locator('.plot svg').count()==2);ensure(p.evaluate('__mathErrors.length+__uiErrors.length')==0);p.close();return {'separate_scripts':len(scripts)}
 record('Source-tree entry matches standalone bundle',source_entry)
 record('No console or application errors',lambda:ensure(not errors and not console and page.evaluate('__mathErrors.length+__uiErrors.length')==0,str({'page':errors,'console':console,'application':page.evaluate('__uiErrors')})))
 record('No external network requests initiated by lecture',lambda:ensure(not [u for u in requests if u.startswith(('https://','http://'))],str(requests)))
 report={'suite':'Large-type proof edition Chromium verification','timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':browser.version,'loading':'Exact standalone HTML via set_content; independent source entry via separate script/style injection','navigation':navigation,'not_tested':['Native PDF viewer','Firefox and Safari','Direct website downloads during browser tests'], 'tests':len(results),'passed':sum(r['status']=='pass' for r in results),'failed':sum(r['status']=='fail' for r in results),'duration_seconds':round(time.perf_counter()-t0,2),'console_errors':console,'page_errors':errors,'network_requests':requests,'results':results}
 (OUT/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:report[k] for k in ['browser','tests','passed','failed','duration_seconds']}),flush=True);browser.close();sys.exit(bool(report['failed']))
