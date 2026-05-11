---
description: |
  jh-* 前缀的封装组件系列（不限于 jh-form / jh-table / jh-tree / jh-pagination / jh-drag-col）
  的识别、诊断和修复规则。Layer L2，优先级 #2（次于 Base*）。
applyTo: "**/*.vue"
---

# Skill: vendors/jh-components

> Layer L2 · Vendor priority **#2**

## Detect（识别）

所有 `<jh-*>` 标签均归入本 Skill。下表是当前项目集群的代表性基线，不是完整清单。

| 类型 | 子组件 | 标签 | 关键类名 | 治理方式 |
|---|---|---|---|---|
| 专项样式覆盖 | jh-tree | `<jh-tree>` | `.jh-tree` / `.base-tree` | `styles/vendors/_jh-tree.scss` |
| 专项样式覆盖 | jh-pagination | `<jh-pagination>` | `.jh-pagination` | `styles/vendors/_jh-pagination.scss` |
| 专项样式覆盖 | jh-drag-col | `<jh-drag-col>` | `.drag-col-container` / `.drag-left` / `.slider-col` | `styles/vendors/_jh-drag-col.scss` |
| 通用规则治理 | jh-table | `<jh-table>` | `.jh-table` | 继承 L0 tokens + L1 table 视觉原则 |
| 通用规则治理 | jh-form | `<jh-form>` | `.jh-form` | 继承 L0 tokens + L1 form 视觉原则 |
| 通用规则治理 | 其它 jh-* | `<jh-*>` | `.jh-*` / 组件内部 Element Plus 类 | 先按 jh 通用规则治理，复杂结构再升级专项样式 |

## Diagnose

- ❌ 自行给 `.jh-tree` 写颜色覆盖（应用全局 `vendors/_jh-tree.scss`）
- ❌ jh-drag-col 内自定义 padding 破坏拖拽条对齐
- ❌ jh-pagination 未对齐到右侧（同 R011）
- ❌ jh-form 内不用 `size="small"` 控件（同 R006）
- ❌ 发现新的复杂 `<jh-*>` 组件后只在页面局部写补丁，而不沉淀到 L2 Project Vendors

## Repair

### A 类
- 控件 size 缺失 → 补 `size="small"`
- 表单内日期选择器无宽度 → `style="width:100%"`（R007）

### B 类
- 直接全局覆盖 `.jh-*` → 改为引入 `wl-skills-ui/styles` 由 vendors 层处理
- 新的复杂 `<jh-*>` 组件 → 先判断是否只是 Element Plus 薄封装；若不是，应新增 `styles/vendors/_jh-xxx.scss` 和对应 Skill/检测规则

## 全局样式来源

- `styles/vendors/_jh-tree.scss`
- `styles/vendors/_jh-pagination.scss`
- `styles/vendors/_jh-drag-col.scss`

## 新增 jh 专项覆盖准入

满足任一条件时，应从通用规则治理升级为专项样式覆盖：

- 组件内部包含多个 Element Plus 组件或复杂 DOM 结构
- 默认样式明显偏离当前项目集群 tokens / spacing / radius
- 高频出现在列表、树表、弹窗、详情、上传、流程等核心页面
- scanner 或人工审计反复发现相同视觉问题
- AI 按通用规则无法稳定修复
