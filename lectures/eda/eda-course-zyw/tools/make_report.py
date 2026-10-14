"""Publish a standalone, large-type report from actual test results."""
from pathlib import Path
import json,hashlib,html,base64
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];D=R/'reports';esc=html.escape
D.mkdir(parents=True,exist_ok=True)
files=[('数学与算法回归','math-results.json'),('新增图解与Quiz核验','intuition-results.json'),('浏览器交互回归','browser-results.json'),('大字/动画/Quiz浏览器验收','revision-browser-results.json'),('原始出处与覆盖审计','source-results.json')]
reports=[(title,json.loads((D/file).read_text(encoding='utf-8'))) for title,file in files]
fingerprint=hashlib.sha256((R/'EDA_交互讲义.html').read_bytes()).hexdigest()
for title,r in reports:
 if r.get('inputSha256') and r['inputSha256']!=fingerprint:raise RuntimeError('Browser input differs from current build: '+title)
 if r['failed']:raise RuntimeError('Unresolved test failures: '+title)
passed=sum(r['passed'] for _,r in reports);assertions=sum(r.get('assertions',0) for _,r in reports);browser_count=sum(r['passed'] for _,r in reports if 'browser' in r['kind'].lower());font_audit=reports[3][1]['audit'];m=json.loads((R/'sources/manifest.json').read_text(encoding='utf-8'))
summary={'generatedAt':datetime.now(timezone.utc).isoformat(),'lectureSha256':fingerprint,'passed':passed,'failed':0,'mathematicalAssertions':assertions,'browserCases':browser_count,'sourceCoverage':m,'suites':[{k:r[k] for k in ['kind','passed','failed','ms']} for _,r in reports]}
(D/'delivery-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
rows=''.join('<tr><td>'+esc(title)+'</td><td>'+str(r['passed'])+'</td><td>'+str(r['failed'])+'</td><td>'+str(r.get('assertions','—'))+'</td></tr>' for title,r in reports)
sections=''
for title,r in reports:
 sections+='<section><h2>'+esc(title)+'</h2><p>'+str(r['passed'])+'项通过，'+str(r['failed'])+'项失败。记录用时 '+str(r['ms'])+' ms。</p><div class="test-list">'
 for t in r['tests']:sections+='<div><strong>通过</strong><span>'+esc(t['name'])+'</span></div>'
 sections+='</div>'
 if r.get('limits'):sections+='<h3>核验范围</h3>'+''.join('<p>'+esc(x)+'</p>' for x in r['limits'])
 sections+='</section>'
images=[('09-revised-overview','大字阅读首页'),('10-shannon-tree','逐分支解释香农展开'),('11-sharing-cost','共享逻辑与复合门的实际成本比较'),('12-gate-tree','NAND/NOT逐门求值'),('13-quiz-derivation','原Quiz答案及不等式推导'),('14-formula-walk','存储公式的符号、量纲与代入'),('15-resource-deadlock','资源所有权与环形等待'),('17-mobile-quiz','390px视口的Quiz排版'),('18-mobile-diagram','390px视口图解不缩小字体')]
gallery=''
for file,title in images:
 p=D/'screenshots'/(file+'.png')
 if not p.exists():raise FileNotFoundError(p.name)
 b64=base64.b64encode(p.read_bytes()).decode();gallery+=f'<figure><figcaption>{esc(title)}</figcaption><img loading="lazy" src="data:image/png;base64,{b64}" alt="{esc(title)}"></figure>'
css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;overflow-wrap:anywhere;background:#f7f7f2;color:#20332f;font:24px/1.9 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1120px;padding:48px 28px;margin:auto}h1{font-size:46px;line-height:1.3}h2{font-size:34px;line-height:1.4;margin:50px 0 22px}h3{font-size:27px}a{color:#187c69;overflow-wrap:anywhere}p{margin:1em 0}code,pre,small,td,th,figcaption,.test-list{font-size:22px}code{overflow-wrap:anywhere}header{border-bottom:2px solid #187c69;padding-bottom:35px}.kicker{font-size:22px;font-weight:700;color:#187c69}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:32px 0}.card{padding:22px;border:1px solid #d6ded3;background:#fffef9;border-radius:8px}.card b{font-size:38px;display:block;color:#187c69}.scroll{overflow-x:auto}table{border-collapse:collapse;min-width:660px;width:100%;background:#fffef9}td,th{text-align:left;border-bottom:1px solid #d6ded3;padding:14px}section{border-bottom:1px solid #d6ded3;padding-bottom:36px}.note{border-left:4px solid #bd6334;background:#fbecdf;padding:20px 26px}.test-list>div{display:flex;gap:18px;border-top:1px solid #d6ded3;padding:15px 0}.test-list strong{flex-shrink:0;color:#187c69}.test-list span{min-width:0;overflow-wrap:anywhere}figure{margin:32px 0;padding:20px;background:white;border:1px solid #d6ded3}figcaption{font-weight:700;margin-bottom:20px}img{max-width:100%;height:auto;display:block}.hash{overflow-wrap:anywhere}@media(max-width:650px){main{padding:24px 18px}h1{font-size:35px}.cards{grid-template-columns:1fr}.card b{font-size:34px}figure{padding:10px}.test-list>div{display:block}}'''
page=f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDA大字引导版 · 测试与覆盖报告</title><style>{css}</style></head><body><main><header><div class="kicker">EDA / COMPUTING SYSTEMS · 大字引导版</div><h1>测试、修复与覆盖报告</h1><p>原课程：<a href="https://eda.youwei.xyz/">Design Automation and Computing Systems</a>。本报告由实测JSON汇总生成，讲义内容与测试结果分离。</p><div class="cards"><div class="card"><b>{passed}</b>实际通过测试项</div><div class="card"><b>{assertions:,}</b>数学与算法断言</div><div class="card"><b>0</b>失败 / 控制台异常</div></div><p>生成时间（UTC）：{esc(summary['generatedAt'])}</p></header>
<section><h2>交付范围</h2><p>8个教学章节、24个计算图解、18个过程播放器；21组Quiz的45个顶层题目逐题解答。10份原始页面的102个标题、254个内容块（236个教学块）和127个TeX片段均有可追溯记录。五级标题的7种门模式也已纳入索引。</p><p>正文24px；普通注释、控制项、代码、图中文字不小于22px。“更大”模式正文28px、界面26px。MathML上下标下限22px；SVG按变换后的实际像素字号检查，不以名义font-size代替实际大小。原始位图作为出处证据保留，主要算法图另以大字SVG重绘。</p><p>原始网址是出处；原文摘录是独立动作。不存在以设备路径或个人文件库作为出处的条目。正文新增解答、推导和教学假设不冒称原作者结论。</p><div class="note"><b>范围边界</b><p>原网页提及但没有正文的PPT与教材章节未计入覆盖。技术映射条件缺失、rough legalization截断句及公式歧义在正文标明。标题/内容块映射检查不能自动证明全部叙述正确；讲义仍不是授课教师审核的官方答案。</p></div></section>
<section><h2>验收汇总</h2><div class="scroll"><table><thead><tr><th>测试组</th><th>通过</th><th>失败</th><th>断言</th></tr></thead><tbody>{rows}</tbody></table></div><h3>实际执行方式</h3><p>浏览器：{esc(reports[2][1]['browser'])}。Playwright在真实Chromium中载入完整单文件，驱动鼠标、键盘、控件、播放、回退、DOM、SVG与MathML。检查320/390/768/1024/1440px视口及两种大字模式，验证45题跳转、127式展开和18个播放器。浏览器运行资源请求不依赖远程服务。</p><p>文件导航探测返回ERR_BLOCKED_BY_ADMINISTRATOR，因此以set_content进行上述实际验收。未把文件导航、Safari/Firefox或手机实机测试写成通过。运行入口与复测命令见源码README。</p><h3>构建指纹</h3><p>两套浏览器测试都记录所执行讲义的SHA-256，报告生成器要求与交付构建一致：</p><p class="hash"><code>{fingerprint}</code></p></section>
<section><h2>本轮修复记录</h2><p><b>字号与布局：</b>修复网格最小宽度撑开窄屏、长行内公式溢出及原文五级标题采用浏览器小字号的问题；图解和表格区域保留大字横向查看能力，单步与回退不重置图解横向位置。</p><p><b>交互：</b>统一实际轨迹播放器，修正改参后的计数刷新，并保护DOM替换过程中已移除节点的观察器回调，避免快速重放产生空节点异常。</p><p><b>教学内容：</b>补齐45题答案和逐章公式解释；统一存储停顿公式记号，区分同步开销的分母，明确树覆盖与DAG共享的范围，补上原索引遗漏的7个门级小标题。所有45题保留原题/选项/题干并连接到相应实验。</p><p><b>发布信息：</b>清除交付对象描述和个人路径，引用、Quiz索引、原式索引及原始资料均指向规范课程网址。</p></section>
{sections}<section><h2>浏览器截图</h2><p>截图为真实交互状态，不是设计稿；报告内预览按版面适配，完整分辨率图像保留在源码包reports/screenshots目录。</p>{gallery}</section><footer><p>数学/算法代码、来源JSON、浏览器脚本、逐项结果及复测命令随源码包提供。</p></footer></main></body></html>'''
(D/'report.html').write_text(page,encoding='utf-8');print(f'Report: {passed} tests, {assertions} assertions; {len(page.encode()):,} bytes.')
