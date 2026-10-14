# 最优化 · 直觉、证明与实验

本版包括 **34 节讲义、40 组详细证明、264 个证明步骤、40 幅可播放计算图解、37 个算法／参数实验，以及 298 条编排公式**。

## 开始阅读

解压后打开 `Optimization_Explorable.html`。正文、公式、计算内核和原文提取文本已内嵌，不需要安装依赖、连接 API 或启动构建工具。

`index.html` 是分文件源码入口，与自包含讲义使用同一套内容和计算逻辑。浏览器限制直接打开文件时，可在工程目录执行：

```sh
python tools/serve.py
```

随后访问命令输出的地址。使用 Windows Python 启动器时，将 `python` 替换成 `py`。

## 阅读与交互

正文默认 26px，窄屏为 24px；界面、来源、图例和数学脚标使用不低于 22px 的显示字号。字号按钮还提供更大的阅读档位。长公式与大幅依赖图在各自容器中滚动，不通过缩小字体挤进屏幕。原始 PDF 保持原貌，便于核对。

每组证明先说明假设和几何直觉，然后提供独立计算图解、完整步骤、每一步的图示观察提示及原文页码。完整证明默认展开；“证明导读”只切换强调位置，不隐藏推理。图解播放与证明导读是两个独立控制。图解可拖动、播放、暂停、回退和重置；算法图解只回放真实计算状态，不把两点间插值冒充新的算法迭代。

后续算法实验继续支持输入案例切换、参数调整、单步、回退、十步运行、历史定位、状态导出。改变输入会重新初始化；随机数状态随历史一同恢复。图示是教学输入，不是教材实验数据或求解器性能报告。

## 原始资料来源

教材、电子教案与课程资料下载自北京大学文再文老师网站：

- 最优化教材主页：<https://faculty.bicmr.pku.edu.cn/~wenzw/optbook.html>
- 2026 年秋季课程主页：<https://faculty.bicmr.pku.edu.cn/~wenzw/opt-2026-fall.html>

《最优化：建模、算法与理论》与《最优化计算方法》的作者为刘浩洋、户将、李勇锋、文再文；电子教案和其他文件的贡献者以原始署名及网站说明为准。课程页面链接的站外材料另列实际发布方。

资料库逐项提供原始下载 URL。“网站原始 PDF”指向原站，“归档副本”指向工程中的原文件。第二版 PDF 的正文印刷页为物理页序减 18；其余文件使用各自物理页序，避免混用不同版本页码。

65 个收录条目中，64 个是带公开 URL 的原始资料或关联页面，1 个为下载清单元数据。41 份 PDF 合计 1,990 个物理页。原文件保持字节不变，完整性记录见 `data/source_manifest.csv`。提取文本不是重新排版的原文公式，符号及图表须核对 PDF。

## 覆盖范围

40 组证明覆盖本讲义所选的核心结论、例子和算法性质，并不意味着原始 1,990 页中的每个定理、习题、应用与变体都已重写。教材的 266 个目录节点可以在覆盖页面定位。教材主页与收录清单的 33 个差项也保留原始入口；未收录不表示原链接失效。

所有新增图解、详细推导和解释均标作教学重编或教学补充，不冒称原作者逐字表述。原材料的版权与署名保持不变。

## 源码结构

```text
index.html                    分文件入口
Optimization_Explorable.html  自包含入口
assets/math.js                双精度数值内核
assets/experiments.js         37 个纯计算实验定义
assets/plot.js                计算驱动的 SVG 绘图
assets/intuition.js            证明图解、FISTA/ADMM 能量等计算
assets/proofs.js               证明步序与图解播放控制
assets/app.js                  章节、实验、资料库及原文阅读器
assets/style.css               大字号、响应式与阅读排版
assets/katex.min.js            KaTeX 数学排版；许可证另附

data/chapters.json            正文、假设、证明步骤与原始页码
data/formula_index.json       298 条公式索引
data/edition.json             本版内容统计
data/sources.json             原始地址、完整性与来源元数据
data/pages.json               逐页提取文本
data/coverage.json            教材目录映射与覆盖边界
source/site/                 保持原貌的资料归档
tests/                       可复现测试
reports/                     本版实际测试记录与截图
tools/                       内容生成、打包、报告与服务脚本
```

数值内核与实验定义独立于 DOM。可通过 Node 导入；证明图解也有独立计算接口，便于做差分与不等式核验。KaTeX 输出原生 MathML，工程不附带字体文件。

## 重新构建与测试

仅阅读不需要安装下面的开发依赖。数值测试需要 Node；独立核验与浏览器测试需要 Python、NumPy、SciPy、Playwright 和已安装的 Chromium。

```sh
python -m pip install -r requirements-dev.txt
python tools/build_single.py
node tests/math.test.cjs
node tests/proofs.test.cjs
python tests/independent.py
python tests/browser.py
python tools/build_report.py
```

`CHROMIUM_PATH` 可指定 Chromium 可执行文件。测试脚本不会更改浏览器安全策略。执行环境若禁止 `file:` 导航，则通过向真实 Chromium 加载同一份自包含 HTML，以及单独加载分文件源码来核验 DOM、SVG、MathML 与交互；这不等价于已经测试原生 PDF 查看器。实际结果与未覆盖项见 `reports/test-report.html`。

修改正文请编辑 `data/chapters.json`，再运行 `python tools/sync_content.py` 和 `python tools/build_single.py`。`tools/revise_content.py` 保留本版详细证明的可再生成文字来源；运行它会按脚本内容重建证明段落，随后也应同步内容并重跑测试。
