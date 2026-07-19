# 独立闭环与可选协同

`wl-skills-ui` 是独立的 UI 工程包。它不要求业务项目安装 `wl-skills-design`、`wl-skills-kit` 或 `wl-skills-bd`，也不读取后端生成结果才能工作。

## 独立闭环

```text
项目源码 → check/doctor → audit/scan → fix dry-run
        → 自动快照 + fix → 自动复检 → 人工语义修复
        → drift gate → snapshot rollback（需要时）
```

- `check/doctor` 验证接入、版本配对和样式入口。
- `audit/scan` 只读输出结构化问题与覆盖率。
- `fix` 只处理 `standards/rules.json` 明确标记的安全修复项，结束后自动复检。
- 快照失败时不写代码；回退拒绝项目外路径。
- `drift` 允许存量项目冻结历史欠债，只阻断新增污染。

## 与 kit 的天然协同

如果项目同时使用 `wl-skills-kit`，双方只共享稳定约定，不建立包依赖：

- kit 的 `page-spec.mode` 对应 UI 的 list-page、tree-list、form-dialog、detail-page 等布局语义。
- `platformComponents` 可用于选择 BaseTable、jh-*、Element Plus 等 vendor 规则，但 UI scanner 最终仍以实际源码为准。
- kit 负责业务代码结构、API 契约和页面完整性；UI 负责 token、视觉规则、组件族和样式回归，两者验证结果互不替代。

没有 page-spec 时，UI 通过源码、依赖和 DOM/组件族检测建立自己的审计上下文，能力不降级为“必须等待上游”。

## 非僵化原则

大屏、地图、流程设计器等特殊页面可以通过 `.wl-exempt.json` 做路径级或规则级豁免。豁免必须有原因、纳入版本控制并定期收敛；新增业务不能默认进入豁免区。
