---
description: |
  C_/c_ 前缀的项目自封装组件（团队约定的未来主流命名）。Layer L2，优先级 #3。
  目前是占位 + 探测引导，待团队约定的具体 C_* 组件落地后填充细节。
applyTo: "**/*.vue"
---

# Skill: vendors/c-components

> Layer L2 · Vendor priority **#3** · 团队未来主流命名约定

## Detect

| 模式 | 示例 |
|---|---|
| PascalCase 标签 | `<C_Form>` / `<C_Table>` / `<C_DataPicker>` |
| kebab-case 标签 | `<c-form>` / `<c-table>` / `<c-data-picker>` |
| 类名 | `[class^='c-']` / `[class^='C_']` |
| Import | `from '@/components/C*/'` / `from '@/business/c-*/'` |

## Diagnose

由于 C_* 属于团队约定的未来主流封装，识别到时优先按以下规则：
- 检查内部是否调用了未对齐的 el-* 控件
- 自行写的颜色硬编码 → 引导改用 token
- 控件 size / 边距 / 圆角是否符合 element/_*.scss 规范

## Repair

A 类：补 size、补 empty-text、改 hex → token
B 类：建议沉淀新的 `c-*` skill（拿到源码后）+ 在 `styles/vendors/_c-components.scss` 追加精确选择器

## 扩展引导

当出现新的 C_* 组件时，请把组件名称、典型 DOM 结构添加到本文件 + `_c-components.scss`，
便于后续 AI 精确识别。
