---
description: |
  全量审计流程 — 不修改任何文件，输出按 layer/vendor 分层的可读报告。
  适用：项目接入前评估、CI 检查、季度健康度盘点。
applyTo: "**/*.{vue,scss}"
---

# Flow: full-audit

> 纯审计流程（read-only）

## 触发短语

- "用 wl-ui 全量审计当前项目"
- "audit 流程跑一下"
- "出一份风格健康度报告"

## 执行步骤

### Phase 1 — 扫描全量
```bash
npx wl-ui scan --target src --outFile audit-report.md
```

### Phase 2 — 按层分组统计
报告按以下维度汇总：

| 维度 | 说明 |
|---|---|
| **Layer** | L0 tokens / L1 element / L2 vendors / L3 layouts |
| **Vendor** | element / base-table / jh / c-prefix / custom / ag-grid |
| **Severity** | error / warn / info |
| **File** | 按文件归集，便于点选跳转 |

### Phase 3 — 探测未识别封装
- 扫描 `src/components/` 下 `.vue` 文件
- 输出"未匹配 vendor skill"清单
- 给出"是否扩展 skills/vendors/_registry.md"建议

### Phase 4 — 探测未覆盖布局
- 扫描页面级容器 class（`.list-*` / `.tree-*` 等）
- 对比 `styles/layouts/` 已有骨架
- 输出"是否新增 layouts/<name>.scss" 建议

### Phase 5 — 输出建议清单

```
[audit] 总计：123 处问题
  L0 tokens:  45 处（颜色硬编码）
  L1 element: 56 处（size/对齐/empty-text）
  L2 vendors: 22 处（base-table 12 / jh 7 / custom 3）
  L3 layouts: 0 处

[扩展建议]
  - 发现未识别封装组件 3 个：<MyChart>, <RichEditor>, <TableExport>
    → 建议在 skills/vendors/custom-wrappers/ 追加识别规则
  - 发现新页面骨架 1 个：.dashboard-grid（src/views/dashboard）
    → 建议在 styles/layouts/ 新增 _dashboard.scss
```

## 不做的事

- ❌ 不修改任何文件
- ❌ 不触发 fix
- ❌ 仅诊断和建议
