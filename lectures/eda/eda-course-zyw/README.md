# 从逻辑到芯片，从芯片到计算 · 桌面阅读版

原课程：<https://eda.youwei.xyz/>。八章中文可探索讲义，24个计算图解、18个过程播放器，45道原Quiz逐题解答。默认桌面正文18px、界面与注释16px、侧栏15px；手机正文17px。顶部“放大字号”切换为22px正文。图解保持原始清晰标注，长公式、表格和窄屏图解可局部横向滚动。数学使用KaTeX产生MathML，不附带字体文件。

## 阅读与运行

直接以现代浏览器打开 `EDA_交互讲义.html`，所有运行代码、原文和原图均包含在一个文件中。也可保留整个目录并打开 `index.html`。程序没有遥测、账号、持久化个人数据或远程计算请求；只有主动访问原始出处才需要网络。

每个图解先给预测问题，再给观察目标及原因。过程型图解可播放、暂停、调速、单步、回退和切换案例；参数修改会重新计算。播放进度来自算法状态而非装饰动画。窄屏采用图表区域横向移动，不缩小文字。系统的减少动态效果偏好会禁用位置补间；单步操作仍然有效。

## 原文范围与Quiz

公开资料包含课程首页、教学安排和8个章节，共102个标题、254个内容块（其中236个教学块）、127个TeX片段。21组Quiz包含45个顶层题目；选择题选项、共用题干和嵌套要求均保留，不以一条选项充作一道新题。

所有原Quiz答案默认展开，可按章隐藏自测。附录提供Quiz索引、原式索引、逐标题覆盖映射和原始出处。原文摘要按钮独立于原始链接，避免把资料副本冒充出处。网页无页码，引用采用原始标题锚点。正文新增推导、数值案例和教学模型明确标注为解释性补充。

原网页提及但没有正文的流水线PPT、三本教材指定章节，不计为已覆盖。技术映射最后一道成本题缺单价且ASCII符号有歧义，按可确定条件解答而不编造唯一最优值。其他原式校核及截断内容见正文。

## 构建与复测

构建仅需Python 3，数学测试需Node.js。来源审计需Beautiful Soup 4；浏览器测试需Python Playwright与Chromium。

```sh
python tools/build.py
node tests/math.test.cjs
node tests/intuition.test.cjs
python tests/source_test.py
python tests/browser_test.py
python tests/revision_browser_test.py
python tools/make_report.py
```

测试脚本在根目录 `reports/` 写入JSON记录、截图和HTML报告。Node数学测试有固定随机种子、独立算法对照和有界穷举。设置 `CHROMIUM` 可指定浏览器可执行文件；缺省使用PATH中的Chromium，或Playwright管理的浏览器。

默认浏览器测试通过 `set_content` 在真实Chromium执行完整单文件。支持实际网页导航的环境可运行 `python -m http.server 8000`，再传 `--url http://127.0.0.1:8000/index.html`。发布测试没有把受策略限制的文件导航或未执行的Safari/Firefox测试算作通过。

## 源码结构

`src/content.html` 是完整正文和逐题解答；`core.js` 是原17实验的数学模型；`intuition-core.js` 是新增7个图解模型；`app.js` 是基础界面；`pedagogy.js` 提供预测引导、播放器及索引；`style.css` 最后的 screen-only 区块定义桌面阅读版与响应式布局，打印样式保持原版。

`sources/` 保存公开章节文本、原文内容、出处、45道题、127个公式片段、逐标题和逐内容块映射。`tools/sync_data.py` 可从JSON重新生成浏览器数据文件。正文与Quiz JSON必须同步编辑，来源测试会检查两者一致性。`vendor/` 只含KaTeX运行程序与许可。

教学实验采用小规模、明确假设的模型；不声称实现完整工业布局器、商用STA、现代CPU或系统并发库。不属于授课教师审核的官方答案。

## 本次排版修订与验证

- 默认18px正文、1.8倍行距，正文行宽最多880px；内容区扩宽，侧栏224px，顶栏64px。
- 章节、题目、按钮、注释恢复清晰字号层级，缩减过大的留白。中文按正常标点规则换行，英文词与数学表达式不强制拆开。
- 原始算法、24个图解、45题正文和交互逻辑保留。MathML恢复浏览器正常的上下标与分式比例。
- 测试：数学43项及新增模型15项通过；原文和模型保留性检查通过。详见 reports/desktop-layout/verification.json。
- 本轮浏览器启动受执行环境限制，未完成真实布局、交互复测或新截图，不能把旧截图视作新版结果。reports/original-big-type/ 仅为原包历史记录。
- 可在具备Chromium和Python Playwright的环境执行 python tests/desktop_layout_test.py，检查1366×768、1440×900、1920×1080、375×812布局并生成截图；python tests/browser_test.py 复测原交互。
- 普通长讲义仍正常纵向滚动；宽公式、SVG与流水线表格允许局部横向滚动，以免挤压文字或错误拆分。
