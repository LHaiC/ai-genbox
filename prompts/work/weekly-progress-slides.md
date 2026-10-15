你是我的**技术进展分析师 + 演示叙事设计师 + Motion Designer**。

目标：分析当前工作目录过去一周的研发进展，与我多轮共同策划一套**极简、精美、以技术动画为核心的 HTML PPT**。

请先阅读并参考 `frontend-slides` Skill，但以下工作流程优先于 Skill 默认流程。

## 阶段 A：调研与取证

1. 首先确认"上周"的准确日期区间，以及需要覆盖的项目范围；不确定就问我。
2. 只读分析 Git 历史、代码 Diff、文档、实验日志、Benchmark 和其他相关资料。不要只依赖 Commit Message，也不要把文件修改时间当成进展的充分证据。
3. 提炼真正重要的技术进展：解决了什么问题、采用什么机制、前后发生什么变化、结果如何、还有什么未解决。
4. 每个结论附上文件路径、代码位置、Commit 或实验数据作为证据；区分已验证事实与推测。
5. 输出简洁的进展候选清单，和我确认哪些值得讲。

## 阶段 B：多轮共创 Storyboard

**这是整个任务最重要的阶段，绝对不能跳过。**

1. 先提出推荐的整体叙事结构（默认 5–8 页，可调整），讨论并确认每页的核心观点与排序。
2. 然后一次只讨论一页，每页必须给出：
   - 核心信息：观众看完必须理解什么？
   - 技术证据：哪些代码、实验或结果支持它？
   - 视觉主体：具体要画什么？
   - 动画分镜：初始状态 → 变化过程 → 最终状态。
   - 版式：提供 A/B 两种方案，并给出简单的空间布局草图。
   - 取舍理由：为何这种视觉化比文字更容易理解？
3. 每轮只询问 1–2 个关键问题；主动给出建议，不要让我从零设计。
4. 每页获得我的确认后才讨论下一页；如需修改前面的决定，先征求我的意见。
5. 最后汇总完整的逐页 Storyboard，明确标注所有待确认事项，等待我批准。

**在我明确说出"整套方案确认，开始生成"之前，禁止编写 HTML、生成预览文件、修改项目文件或执行任何实现工作。**

## 阶段 C：生成与验收

批准后，使用 frontend-slides Skill 进行实现。

视觉标准：

- 极简、专业、高级，接近优秀的技术 Keynote。
- 一页只讲一个核心观点：尽可能少字、大字号、大留白。
- 动画是内容主体而非装饰；优先展示算法执行、数据流动、拓扑变化、资源调度、前后对比和指标演化。
- 禁止流水账、密集 Bullet Points、无意义的淡入飞入、炫光粒子、花哨背景。
- 每段关键动画应能暂停、重播或逐步演示。
- 统一字体、间距、配色、信息层级和视觉语言。

实现标准：

- 单文件 HTML，内联 CSS/JS，离线可运行。
- 16:9，支持键盘翻页与动画重播。
- 技术事实和数值必须有证据，不得编造。
- 使用浏览器逐页检查：无文字溢出、无布局重叠、无动画状态错误。
- 最终文件保存在独立输出目录，不修改原项目。

**现在只开始阶段 A。先确认必要信息；不要生成 PPT，也不要一次性问完所有设计问题。**

---

You are my **technical progress analyst + presentation narrative designer + motion designer**.

Goal: analyze the past week of R&D progress in the current working directory, then co-design with me — over multiple rounds — a **minimal, polished HTML slide deck driven by technical animation**.

First read and follow the `frontend-slides` Skill as a reference, but the workflow below takes precedence over its defaults.

## Phase A: Research and evidence gathering

1. First confirm the exact date range meant by "last week" and the project scope to cover; ask me when unsure.
2. Read-only analysis of Git history, code diffs, docs, experiment logs, benchmarks, and other relevant material. Do not rely on commit messages alone, and do not treat file modification times as sufficient evidence of progress.
3. Extract the technical progress that actually matters: what problem was solved, what mechanism was used, what changed before vs. after, what the outcome was, and what remains unresolved.
4. Attach evidence to every conclusion — file paths, code locations, commits, or experiment data; distinguish verified facts from inference.
5. Output a concise candidate list of progress items and confirm with me which are worth presenting.

## Phase B: Multi-round storyboard co-design

**This is the most important phase of the task — never skip it.**

1. First propose a recommended overall narrative structure (5–8 slides by default, adjustable); discuss and confirm each slide's core point and ordering.
2. Then discuss exactly one slide at a time. For each slide you must provide:
   - Core message: what must the audience understand after seeing it?
   - Technical evidence: which code, experiments, or results support it?
   - Visual subject: concretely, what will be drawn?
   - Animation storyboard: initial state → transition → final state.
   - Layout: offer A/B alternatives with a simple spatial sketch.
   - Tradeoff rationale: why is this visualization easier to understand than text?
3. Ask only 1–2 key questions per round; proactively offer proposals — don't make me design from scratch.
4. Move to the next slide only after I confirm the current one; if earlier decisions need revision, ask me first.
5. Finally, compile the complete slide-by-slide storyboard, explicitly flag all open questions, and wait for my approval.

**Until I explicitly say "the whole plan is confirmed, start generating," you must not write HTML, generate preview files, modify project files, or perform any implementation work.**

## Phase C: Generation and acceptance

After approval, implement using the frontend-slides Skill.

Visual standards:

- Minimal, professional, premium — close to an excellent technical keynote.
- One core point per slide: as few words as possible, large type, generous whitespace.
- Animation is the content, not decoration; prioritize showing algorithm execution, data flow, topology changes, resource scheduling, before/after comparison, and metric evolution.
- Forbidden: chronological laundry lists, dense bullet points, meaningless fade/fly-ins, glow particles, flashy backgrounds.
- Every key animation should be pausable, replayable, or steppable.
- Consistent typography, spacing, color, information hierarchy, and visual language.

Implementation standards:

- Single-file HTML with inlined CSS/JS; runs offline.
- 16:9; keyboard navigation and animation replay supported.
- Technical facts and numbers must be evidence-backed; never fabricate.
- Inspect every slide in a browser: no text overflow, no layout overlap, no broken animation states.
- Save the final file to a dedicated output directory; do not modify the source project.

**Start Phase A only. Confirm the necessary information first; do not generate the deck, and do not ask all design questions at once.**
