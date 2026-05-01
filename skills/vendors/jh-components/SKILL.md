---
description: |
  jh-* 前缀的封装组件系列（jh-form / jh-table / jh-tree / jh-pagination / jh-drag-col 等）
  的识别、诊断和修复规则。Layer L2，优先级 #2（次于 Base*）。
applyTo: "**/*.vue"
---

# Skill: vendors/jh-components

> Layer L2 · Vendor priority **#2**

## Detect（识别）

| 子组件 | 标签 | 关键类名 |
|---|---|---|
| jh-table | `<jh-table>` | `.jh-table` |
| jh-form | `<jh-form>` | `.jh-form` |
| jh-tree | `<jh-tree>` | `.jh-tree` / `.base-tree` |
| jh-pagination | `<jh-pagination>` | `.jh-pagination` |
| jh-drag-col | `<jh-drag-col>` | `.drag-col-container` / `.drag-left` / `.slider-col` |

## Diagnose

- ❌ 自行给 `.jh-tree` 写颜色覆盖（应用全局 `vendors/_jh-tree.scss`）
- ❌ jh-drag-col 内自定义 padding 破坏拖拽条对齐
- ❌ jh-pagination 未对齐到右侧（同 R011）
- ❌ jh-form 内不用 `size="small"` 控件（同 R006）

## Repair

### A 类
- 控件 size 缺失 → 补 `size="small"`
- 表单内日期选择器无宽度 → `style="width:100%"`（R007）

### B 类
- 直接全局覆盖 `.jh-*` → 改为引入 `wk-skills-ui/styles` 由 vendors 层处理

## 全局样式来源

- `styles/vendors/_jh-tree.scss`
- `styles/vendors/_jh-pagination.scss`
- `styles/vendors/_jh-drag-col.scss`
