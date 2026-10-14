只做与当前改动的正确性和端到端性能直接相关、且结果足以改变接受/回退决策的最小验证；不要自行扩展为全仓审查、重复测试、hash/checksum/文件完整性检查或各类防御性边角校验，除非已有具体失败证据、明确风险或仓库规范强制要求；核心回归与代表性端到端验证通过后立即停止。

---

Run only the minimal verification that is directly relevant to the correctness and end-to-end performance of the current change and whose outcome could actually flip the accept-or-revert decision; do not expand it on your own into a repo-wide audit, repeated test runs, hash/checksum or file-integrity checks, or defensive edge-case validation, unless there is concrete evidence of failure, an identified risk, or a repo policy that mandates it. Stop verifying as soon as the core regression and representative end-to-end checks pass.
