对当前代码库进行一次**全局架构审计与激进代码消融**，目标是最小化真实执行路径、概念、状态、配置、接口和模块数量，而非单纯减少 LOC。

先追踪真实调用链、数据流、所有权和生命周期，区分 active / dead / legacy；全面识别重复实现、冗余状态与配置、薄封装、过度抽象、无效兼容层、fallback 和结构不对称。

**优先删除、复用、合并，而非新增。** 尽可能收敛到唯一 canonical 主线，统一 API、状态管理与底层机制；相似功能保持目录、接口和实现同构。追求窄接口、强内聚的 Deep Modules，默认不增加新抽象、wrapper 或第二套机制。允许移除没有真实消费者的旧能力，但不得为了减少代码量破坏清晰的职责边界、所有权、正确性或端到端性能。

按**全局只读审计 → 一次性整改 → 关键正确性回归与代表性 E2E Benchmark → 必要的局部修正 → 收敛**执行。只保留由实际需求或证据证明必要的复杂度；保护现有未提交修改，不停留在计划或文档整理，不进行无意义测试、表面重构或无限审查。

最终简要报告：删减了什么、统一了什么、哪些结构确实不可再简化，以及正确性与性能证据。

---

Run a **global architecture audit and aggressive code ablation** on the current codebase. The goal is to minimize real execution paths, concepts, state, configuration, interfaces, and module count — not merely LOC.

First trace the real call chains, data flow, ownership, and lifetimes, and classify code as active / dead / legacy. Comprehensively identify duplicate implementations, redundant state and configuration, thin wrappers, over-abstraction, ineffective compatibility layers, fallbacks, and structural asymmetries.

**Prefer deletion, reuse, and merging over addition.** Converge toward a single canonical mainline wherever possible, unifying APIs, state management, and underlying mechanisms; keep similar features isomorphic in directory layout, interfaces, and implementation. Pursue narrow-interface, strongly cohesive deep modules, and by default add no new abstractions, wrappers, or second mechanisms. Old capabilities with no real consumers may be removed, but never sacrifice clear responsibility boundaries, ownership, correctness, or end-to-end performance just to reduce code volume.

Execute as **global read-only audit → one-shot remediation → key correctness regression and representative E2E benchmarks → necessary local corrections → converge**. Retain only the complexity that actual requirements or evidence justify; preserve existing uncommitted changes, do not stop at plans or documentation cleanup, and do not run meaningless tests, cosmetic refactors, or unbounded reviews.

Final brief report: what was removed, what was unified, which structures genuinely cannot be simplified further, and the correctness and performance evidence.
