---
description: |
  枚举/状态/分类展示规范 Skill — 表格列中遇到枚举值时，按字段语义选择正确的渲染函数。
  包含状态类/分类类/编号类/数值类/警示文本类五种渲染模式，及静态 map 与动态字典两种接入方式。
applyTo: "**/*.{ts,vue}"
---

# 枚举/状态/分类展示规范

> 凡是表格列，遇到**枚举值**，必须按下表分类选择渲染函数，禁止纯文本展示。

---

## 五类字段 → 五种渲染方式

| 字段类别                    | 典型字段                               | 视觉效果         | 渲染函数                    |
| --------------------------- | -------------------------------------- | ---------------- | --------------------------- |
| **状态类**（二元/流转）     | enableStatus、permitStatus、riskStatus | 实心彩色 Tag     | `renderTagNode(v, MAP)`     |
| **分类/级别类**（归档属性） | coursewareType、trainLevel、planType   | 镂空 outline Tag | `renderClassifyTag(v, MAP)` |
| **编号/代码类**             | riskNo、planNo、fileNo                 | 蓝色圆角徽标     | `renderBadge(v)`            |
| **数值型**                  | baseCount、score                       | 绿色圆角徽标     | `renderCountBadge(v)`       |
| **警示文本型**              | evaluateStandard                       | 红色字体         | `renderDangerText(v)`       |

---

## 状态类颜色语义（强制规范）

| 状态含义                        | ElTag type         | 例子                       |
| ------------------------------- | ------------------ | -------------------------- |
| 正常 / 有效 / 已完成 / 启用     | `success`（绿）    | 已启用、证书有效、已完工   |
| 警告 / 临时 / 待处理 / 即将过期 | `warning`（橙）    | 即将过期、待审批           |
| 停用 / 驳回 / 已过期 / 危险     | `danger`（红）     | 已停用、审批驳回、证书过期 |
| 草稿 / 未开始 / 中性            | `info`（灰）       | 草稿、未处理               |
| 主流程默认状态                  | `"primary"` / `""` | 作业中、处理中             |

---

## 判断原则

```
字段名含 Status / State / Flag   → 状态类 → renderTagNode
字段名含 Type / Level / Kind / Category → 分类类 → renderClassifyTag
字段名含 No / Code / Id（非主键） → 编号类 → renderBadge
字段名含 Count / Score / Weight   → 数值类 → renderCountBadge
字段名含 Reason / Standard / 文本  → 警示文本 → renderDangerText
```

---

## 静态 Map（字典固定时）

```typescript
import { renderTagNode, renderClassifyTag } from '@agile-team/wk-skills-ui/runtime';

export const MY_STATUS_MAP = {
  "0": { label: "待处理", type: "info" },
  "1": { label: "处理中", type: "primary" },
  "2": { label: "已完成", type: "success" },
  "3": { label: "已驳回", type: "danger" },
} as const;

// 在 columnsDef 中：
{ name: 'myStatus', label: '状态', width: 90,
  defaultNode: ({ row }) => renderTagNode(row.myStatus, MY_STATUS_MAP) }
```

---

## 动态字典（后端配置时）

```typescript
import { renderDictClassifyTag } from '@agile-team/wk-skills-ui/runtime/common-preset';

// 只需定义颜色映射，label 由字典动态获取
export const TRAIN_LEVEL_COLOR_MAP: Record<string, string> = {
  "1": "",         // 公司级（蓝）
  "2": "warning",  // 部门级（橙）
  "3": "info",     // 班组级（灰）
};

// 在 columnsDef 中：
{ name: 'trainLevel', label: '培训级别', width: 100,
  defaultSlot: ({ row }) => renderDictClassifyTag(row.trainLevel, 'trainLevel', TRAIN_LEVEL_COLOR_MAP) }
```

> 注意：使用 `renderDictClassifyTag` 前需调用 `setDictResolver(fn)` 注入字典查询函数。

---

## 通用业务预设（已内置，无需重新定义）

`installCommonPreset()` 后通过 `defineColumns()` 自动生效：

| 字段名             | 渲染         | 常量                    |
| ------------------ | ------------ | ----------------------- |
| `riskLevel`        | 风险分级 Tag | `RISK_LEVEL_MAP`        |
| `taskStatus`       | 排查任务状态 | `TASK_STATUS_MAP`       |
| `riskStatus`       | 隐患状态     | `RISK_STATUS_MAP`       |
| `permitStatus`     | 作业票状态   | `PERMIT_STATUS_MAP`     |
| `trainStatus`      | 培训状态     | `TRAIN_STATUS_MAP`      |
| `credentialStatus` | 证书状态     | `CREDENTIAL_STATUS_MAP` |
| `coursewareType`   | 课件类型     | `COURSEWARE_TYPE_MAP`   |

---

## R009 — 状态字段禁止纯文本渲染 【高危，需人工确认】

```diff
// ❌ 纯文本
{ name: 'status', label: '状态' }

// ✅ 使用 defineColumns 自动映射（enableStatus / riskLevel 等已注册字段）
// 或显式指定渲染器：
{ name: 'status', label: '状态', width: 90,
  defaultNode: ({ row }) => renderTagNode(row.status, MY_STATUS_MAP) }
```

## R010 — 分类字段必须 `effect="plain"` 【中危，需人工确认】

```diff
// ❌ 分类字段用实心 Tag
h(ElTag, { type: 'warning' }, () => label)

// ✅ 分类字段用镂空 Tag
h(ElTag, { type: 'warning', effect: 'plain', size: 'small' }, () => label)
// 或直接用 renderClassifyTag(value, MAP)
```
