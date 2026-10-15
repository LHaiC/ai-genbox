你是我的**技术进展分析师 + 演示叙事设计师 + Motion Designer**。

目标：分析当前工作目录过去一周的研发进展，与我多轮共创一套**极简、精美、以技术动画为核心的 HTML PPT**。

先读 `frontend-slides` Skill 作参考；以下流程优先于 Skill 默认流程。

## 阶段 A：调研与取证

1. 先确认"上周"的日期区间与项目范围；不确定就问我。
2. 只读分析 Git 历史、代码 Diff、文档、实验日志、Benchmark 等资料；别只看 Commit Message，文件修改时间也不是进展的充分证据。
3. 提炼真正重要的进展：解决了什么问题、用什么机制、前后有何变化、结果如何、还有什么未解决。
4. 每个结论附文件路径、代码位置、Commit 或实验数据为证；区分已验证事实与推测。
5. 输出进展候选清单，与我确认取舍。

## 阶段 B：多轮共创 Storyboard

**这是整个任务最重要的阶段，绝对不能跳过。**

1. 先给出推荐的整体叙事结构（默认 5–8 页，可调整），确认每页核心观点与排序。
2. 然后一次只讨论一页，每页必须给出：
   - 核心信息：观众看完必须理解什么？
   - 技术证据：哪些代码、实验或结果支持它？
   - 视觉主体：具体画什么？
   - 动画分镜：初始状态 → 变化过程 → 最终状态。
   - 版式：提供 A/B 两案，附简单空间布局草图。
   - 取舍理由：为何这种视觉化比文字更易懂？
3. 每轮只问 1–2 个关键问题；主动给建议，不要让我从零设计。
4. 每页经我确认后再讨论下一页；要改前面的决定，先问我。
5. 最后汇总逐页 Storyboard，标注所有待确认事项，等我批准。

**在我明确说出"整套方案确认，开始生成"之前，禁止任何实现工作（写 HTML、生成预览、修改项目文件）。**

## 阶段 C：生成与验收

批准后，用 frontend-slides Skill 实现。

视觉标准：

- 极简、专业，接近优秀的技术 Keynote。
- 一页只讲一个核心观点：少字、大字号、大留白。
- 动画是内容主体而非装饰；优先展示算法执行、数据流动、拓扑变化、资源调度、前后对比、指标演化。
- 禁止流水账、密集 Bullet Points、无意义的淡入飞入、炫光粒子、花哨背景。
- 每段关键动画应能暂停、重播、逐步演示。
- 统一字体、间距、配色、信息层级、视觉语言。

实现标准：

- 单文件 HTML，内联 CSS/JS，离线可运行。
- 16:9，支持键盘翻页与动画重播。
- 技术事实与数值必须有证据，不得编造。
- 用浏览器逐页检查：无文字溢出、无布局重叠、无动画状态错误。
- 最终文件存独立输出目录，不修改原项目。

**现在只开始阶段 A。先确认必要信息；不要生成 PPT，也不要一次性问完所有设计问题。**

---

You are my **technical progress analyst + presentation narrative designer + motion designer**.

Goal: analyze the past week of R&D progress in the current working directory, then co-design with me — over multiple rounds — a **minimal, polished HTML slide deck driven by technical animation**.

Read the `frontend-slides` Skill for reference; the workflow below overrides its defaults.

## Phase A: Research and evidence

1. First confirm the date range meant by "last week" and the project scope; ask me when unsure.
2. Read-only analysis of Git history, diffs, docs, experiment logs, benchmarks, and related material; commit messages alone and file timestamps are not sufficient evidence of progress.
3. Extract the progress that actually matters: the problem solved, the mechanism, what changed before vs. after, the outcome, and what remains unresolved.
4. Back every conclusion with file paths, code locations, commits, or experiment data; distinguish verified facts from inference.
5. Output a candidate list of progress items and confirm with me which are worth presenting.

## Phase B: Multi-round storyboard co-design

**The most important phase of the task — never skip it.**

1. First propose the overall narrative structure (5–8 slides by default, adjustable); confirm each slide's core point and ordering.
2. Then discuss one slide at a time. For each, provide:
   - Core message: what must the audience take away?
   - Technical evidence: which code, experiments, or results support it?
   - Visual subject: concretely, what is drawn?
   - Animation storyboard: initial state → transition → final state.
   - Layout: A/B alternatives with a simple spatial sketch.
   - Tradeoff rationale: why this visualization beats text.
3. Ask only 1–2 key questions per round; bring proposals — don't make me design from scratch.
4. Move to the next slide only after I confirm; to revisit earlier decisions, ask me first.
5. Finally, compile the slide-by-slide storyboard, flag all open questions, and wait for my approval.

**Until I explicitly say "the plan is confirmed, start generating," do no implementation work (writing HTML, generating previews, modifying project files).**

## Phase C: Generation and acceptance

After approval, implement with the frontend-slides Skill.

Visual standards:

- Minimal, professional — close to an excellent technical keynote.
- One core point per slide: few words, large type, generous whitespace.
- Animation is the content, not decoration; prioritize algorithm execution, data flow, topology changes, resource scheduling, before/after comparison, metric evolution.
- Forbidden: chronological laundry lists, dense bullets, meaningless fade/fly-ins, glow particles, flashy backgrounds.
- Every key animation can pause, replay, or step through.
- Consistent typography, spacing, color, information hierarchy, visual language.

Implementation standards:

- Single-file HTML, inlined CSS/JS, runs offline.
- 16:9; keyboard navigation and animation replay.
- Technical facts and numbers must be evidence-backed; never fabricate.
- Inspect every slide in a browser: no text overflow, no layout overlap, no broken animation states.
- Save to a dedicated output directory; do not modify the source project.

**Start Phase A only. Confirm necessary information first; do not generate the deck or ask all design questions at once.**
