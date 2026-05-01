---
description: |
  陌生封装组件的通用探测策略 — AI 在无 skill 匹配时的兜底逻辑。
  通过 DOM 结构推断对应的 element-plus 控件，给出可解释的诊断和保守修复方案。
applyTo: "**/*.vue"
---

# Skill: vendors/unknown-wrapper

> 兜底探测器 — 当组件不属于已知任何 vendor 时启用

## 工作方式

1. **遍历 import**：识别所有非 element-plus 的组件标签
2. **匹配 vendor skill**：
   - Base* → vendors/base-table（如是表格）/ vendors/base-components
   - jh-* → vendors/jh-components
   - C_*/c_* → vendors/c-components
   - 其他 → vendors/custom-wrappers
3. **若仍未识别**：
   - 输出"未识别的封装组件 `<XxxYy>`"
   - 给出"请在 `skills/vendors/_registry.md` 追加该组件的识别规则"建议
   - 不修改源码，仅输出诊断报告

## DOM 推断表（兜底）

| 内部 DOM 包含 | 推断为 |
|---|---|
| `.el-table` | 表格类 → 应用 R001/R002/R014 |
| `.el-form` | 表单类 → 应用 R006/R008 |
| `.el-dialog` | 弹窗类 → 应用 R011/R015 |
| `.el-pagination` | 分页类 |
| `.ag-root-wrapper` | AG Grid → 走 vendors/ag-grid |

## 输出格式

```
[unknown-wrapper] 检测到未识别封装：<XxxYyy>（src/views/foo.vue:42）
  推断类型：表格类（内部含 .el-table）
  应用规则：R001, R002, R014
  化妆建议：在 styles/vendors/_custom-wrappers.scss 追加：
    .xxx-yyy { /* 复用 vendors/_base-table.scss 的覆盖 */ }
  扩展建议：把该组件信息追加到 skills/vendors/c-components/SKILL.md（若团队约定改前缀）
```
