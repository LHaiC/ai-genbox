from playwright.sync_api import sync_playwright
from pathlib import Path
import json, os, shutil
# Uses an installed Chromium; no browser download or software installation.
p=Path(__file__).resolve().parents[1]; out=p/'reports/desktop-layout';out.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 page=b.new_page(reduced_motion='reduce',device_scale_factor=1)
 page.set_content((p/'EDA_交互讲义.html').read_text());page.wait_for_function('window.__REVISION_READY')
 results=[]
 for w,h in [(1366,768),(1440,900),(1920,1080),(375,812)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{w}-overview.png'))
  for name,sel in [('quiz','.quiz-card'),('formula','.formula-walk'),('cards','#lab-boolean'),('diagram','#lab-shannon')]:
   page.locator(sel).first.evaluate('(e)=>e.scrollIntoView({block:"start"})');page.evaluate('scrollBy(0,-75)');page.screenshot(path=str(out/f'{w}-{name}.png'))
  results.append(page.evaluate('''()=>({width:innerWidth,pageWidth:document.documentElement.scrollWidth,bodySize:getComputedStyle(document.body).fontSize,overflow:[...document.querySelectorAll('main *')].filter(e=>{let r=e.getBoundingClientRect();return r.width && r.right>innerWidth+1 && !e.closest('.diagram-scroll,.table-scroll,.dense-scroll,.equation,.inline-math-wrap,.display-math-wrap,span[data-math],.source-body,pre')}).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,90),right:e.getBoundingClientRect().right})).slice(0,40),scrollAreas:[...document.querySelectorAll('.equation,.diagram-scroll,.table-scroll,.dense-scroll')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).map(e=>({cls:e.className,width:e.clientWidth,scroll:e.scrollWidth}))})'''))
 print(json.dumps(results,ensure_ascii=False,indent=2));(out/'layout-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 b.close()
 assert all(r['pageWidth']<=r['width']+1 and not r['overflow'] for r in results), 'Unexpected whole-page or uncontained horizontal overflow; inspect layout-results.json'
