---
description: |
  UI 风格对齐 Skill — 扫描业务系统 Vue SFC 文件，识别与 wk-skills-ui 标准不一致的写法，
  生成整改清单，经用户确认后执行自动修复，最终验证归零。
  覆盖：表格对齐/空状态、按钮图标化、表单控件尺寸、弹窗分页位置、颜色 Token。
applyTo: "**/*.vue"
---

# UI 风格对齐 Skill

## 一、工作流程（严格按顺序，不得跳过）

### Phase 1 — 扫描（只读，不修改任何文件）

```bash
# 推荐：一站式扫描（接入完整性 + 风格 + 报告）
npx wk-ui all --project [项目根目录] --outFile /tmp/scan-result.md

# 单独风格扫描
npx wk-ui scan --target [项目src目录] --outFile /tmp/scan-result.md

# 接入完整性检查
npx wk-ui check --project [项目根目录]
```

读取扫描输出，提取：

- 接入完整性 I001~I004 通过情况
- 总 issue 数、按规则分类统计（R001~R018）
- 每个 issue：文件路径 + 行号 + 规则 + 建议

### Phase 2 — 汇报

向用户展示摘要：

```
扫描结果摘要
- 扫描文件数：XX
- 发现问题数：XX（高危 X / 中危 X / 低危 X）

高危（直接影响视觉一致性）
| 规则 | 说明 | 数量 | 代表文件 |
...
```

### Phase 3 — 确认（强制门槛）

询问用户：

1. 是否全量修复？还是指定规则/文件？
2. 无法自动修复的规则（R008/R009/R010/R013）是否手动处理？

**未经用户确认，禁止修改任何文件。**

### Phase 4 — 修复

按确认范围执行：

- **A 类（attr 缺失 / hex 颜色）** → `npx wk-ui fix --target [src] [--dry-run]`
- **B 类（结构改造，R004/R013/R015）** → AI 逐文件编辑

每修复一个文件，输出该文件修改摘要。

### Phase 5 — 验证

重新执行 Phase 1 扫描，验证 issue 数量归零或达到预期水平。

---

## 二、规则速查（R001—R018）

### 表格类 → 详见 [skills/components/table/SKILL.md](../../components/table/SKILL.md)

- **R001**【高危】el-table-column 缺少 `align="center"`
- **R002**【中危】el-table 缺少 `empty-text="暂无数据"`
- **R003**【中危】BaseTable 缺少 `empty-text="暂无数据"`
- **R014**【中危】selection 列缺少 `header-align="center"`

### 按钮类 → 详见 [skills/components/table/SKILL.md](../../components/dialog/SKILL.md)

- **R004**【高危】操作列使用文字按钮（应改为 renderOps 图标系统）
- **R005**【中危】工具栏按钮缺少 icon
- **R015**【高危】弹窗嵌套表格操作列使用 el-button link

### 表单类 → 详见 [skills/components/form/SKILL.md](../../components/form/SKILL.md)

- **R006**【中危】el-input / el-select 缺少 `size="small"`
- **R007**【中危】el-date-picker 缺少 `style="width:100%"`
- **R008**【低危】el-form labelWidth < 150px

### 弹窗类 → 详见 [skills/components/dialog/SKILL.md](../../components/dialog/SKILL.md)

- **R011**【高危】弹窗内分页器未放在 `<template #footer>` 中

### 颜色类

- **R016**【中危】`<style>` 块存在硬编码 hex 颜色
- **R017**【中危】`<template>` 块存在硬编码 hex 颜色
- **R018**【中危】`<script>` 块存在硬编码 hex 颜色

### 状态标签类 → 详见 [skills/components/tag-status/SKILL.md](../../components/tag-status/SKILL.md)

- **R009**【高危】状态字段纯文本渲染（需人工确认）
- **R010**【中危】分类字段使用填充色 Tag（需人工确认）

---

## 三、无法自动修复的规则

| 规则                         | 原因                                         | AI 职责                            |
| ---------------------------- | -------------------------------------------- | ---------------------------------- |
| R008 labelWidth              | 可能有特殊布局需求                           | 标注疑似问题 + 给建议 + 等用户确认 |
| R009 状态字段纯文本          | 需识别业务语义                               | 同上                               |
| R010 分类 vs 状态判断        | 需结合字段业务含义                           | 同上                               |
| R013（含 Upload 等特殊操作） | Upload 嵌入 operations[] 需抽离到 toolbarDef | 同上                               |

---

## 四、执行约束

1. Phase 3 用户确认是强制门槛，未确认不得修改文件
2. 每次只修改一类规则，修改后立即验证该类归零再继续
3. 不修改路径：`node_modules/`、`dist/`、`*.min.js`、用户标注为"已手动调整"的文件
4. 脚本幂等：已符合标准的不会被二次修改
