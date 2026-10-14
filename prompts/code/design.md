修改代码前先理解现有架构、主路径和历史决策，优先复用、统一并简化已有机制，避免重复实现、冗余配置和无必要的新抽象。依据根因决定改动规模：局部问题精准修复，结构性问题允许有依据地重构；保持模块边界清晰，并说明正确性、性能与复杂度的取舍。

---

Before changing code, understand the existing architecture, the main path, and past decisions; prefer reusing, unifying, and simplifying existing mechanisms over re-implementation, redundant configuration, or unnecessary new abstractions. Let the root cause determine the scale of the change: fix local problems precisely, and refactor structural problems only with justification. Keep module boundaries clear, and state the trade-offs among correctness, performance, and complexity.
