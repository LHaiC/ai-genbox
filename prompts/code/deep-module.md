把过度分层、数据流分散的浅模块串联收敛为深模块：主流程清晰、实现集中于模块内部、对外暴露最小 API、内部接口显式定义；压平不必要的调用链，收敛公共接口，消除为抽象而抽象的层次，并以重构前后的数据流路径证明简化是真实的而非换了层包装。

---

Collapse chains of shallow, over-layered modules with scattered data flow into a deep module: a clear primary flow, implementation concentrated inside the module, a minimal external API, and explicitly defined internal interfaces. Flatten unnecessary call chains, converge the public interface, eliminate abstraction layers that exist only for their own sake, and demonstrate the simplification is real — not repackaged — by comparing data-flow paths before and after.
