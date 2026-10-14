新开一个 worktree，在不退化正确性与端到端性能的前提下，对当前代码做激进消融：持续删除、合并或替换一切非必要的模块、兼容层、fallback、重复路径和抽象，每一步都用真实回归测试与性能测量决定保留或回退，直到剩余代码都能证明自身必要性为止。

---

Open a new worktree and, without regressing correctness or end-to-end performance, aggressively ablate the current codebase: keep deleting, merging, or replacing every non-essential module, compatibility layer, fallback, duplicated path, and abstraction. Let real regression tests and performance measurements decide what stays or gets rolled back at each step, until every piece of remaining code can justify its own necessity.
