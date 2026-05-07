---
description: |
  UI 风格对齐 Skill —— 扫描 Vue SFC 文件，识别与 wk-skills-ui 五层规范不一致的控件写法，
  生成整改清单，经用户确认后执行全量自动修复，最终验证归零。
  支持老项目 Skin 化妆模式（不改布局）和新项目 Native 原生模式（完整接入）。
applyTo: "**/*.vue"
---

# UI 风格对齐 Skill

## 快速触发与生命周期命令

```bash
# 安装/更新 AI Skill、触发提示、MCP 配置和 manifest
npx wk-ui init --project . --mode native
npx wk-ui update --project .

# 查看差异、体检、清理
npx wk-ui diff --project .
npx wk-ui doctor --project .
npx wk-ui clean --project . --dry-run

# 输出 AI 触发提示
npx wk-ui prompts
```

可选编辑器：`github-copilot`、`cursor`、`windsurf`、`kiro`、`trae`、`claude-code`、`cline`、`agents-generic`、`qoder`。修复前优先使用 `--dry-run` 或 MCP 工具 `wks_ui_fix_dry_run`。


## 一、适用场景
- 新业务系统首次接入统一风格标准（推荐先走「新系统快速接入方案」，见第八节）
- 已有系统定期合规检查
- Code Review 前的自动化预检

---

## 二、工作流程（必须严格按顺序执行，不得跳过）

### Phase 1 — 扫描（只读，不修改任何文件）

```bash
# 推荐：一站式（接入完整性 + 风格扫描 + 报告）
npx wk-ui all --project [项目根目录] --outFile /tmp/scan-result.md

# 单独风格扫描
npx wk-ui scan --target [项目src目录] --outFile /tmp/scan-result.md

# 单独接入完整性检查
npx wk-ui check --project [项目根目录]
```

> 包未安装时也可：`node [SKILL_ROOT]/scanner/index.mjs all --project ...`

读取扫描输出，提取：
- 接入完整性 I001~I004 通过情况
- 总 issue 数量
- 按规则分类统计（R001~R018）
- 每个 issue 的文件路径 + 行号 + 规则 + 建议

### Phase 2 — 汇报

向用户展示以下格式的摘要：

```
## 扫描结果摘要
- 扫描文件数：XX
- 发现问题数：XX（高危 X / 中危 X / 低危 X）

### 高危（直接影响视觉一致性）
| 规则 | 说明 | 数量 | 文件 |
...

### 中危（风格偏差）
...
```

### Phase 3 — 确认

询问用户：
1. 是否全量修复，还是指定规则/文件？
2. 对于无法自动修复的问题（R009/R012），是否手动处理？

**未经确认，禁止修改任何文件。**

### Phase 4 — 修复

按确认范围：
- A 类（attr 缺失 / hex 颜色）→ `npx wk-ui fix --target [src] [--dry-run]`
- B 类（结构改造，如 R004/R013/R015）→ AI 逐文件编辑

每修复一个文件，输出该文件的修改摘要（改了什么、改了几处）。

### Phase 5 — 验证

重新运行 Phase 1 的扫描命令，验证 issue 数量归零或达到预期水平。

---

## 三、规则定义（R001—R022）

### Category A：表格（el-table / AG Grid）

#### R001 — el-table-column 缺少居中对齐【高危】
**检测**：`<el-table-column` 没有 `align="center"`，或有 `align="left"`  
**标准**：所有列必须 `align="center"`，selection 列 width=55，index 列 width=60  
```diff
- <el-table-column label="名称" prop="name">
+ <el-table-column align="center" label="名称" prop="name">
- <el-table-column type="selection" align="left" width="70">
+ <el-table-column type="selection" align="center" header-align="center" width="55">
```
> ⚠️ `selection` 列必须同时加 `align="center"` **和** `header-align="center"`，否则表头复选框与数据行复选框会出现垂直错位。

#### R002 — el-table 缺少空状态文本【中危】
**检测**：`<el-table` 没有 `empty-text` 属性  
**标准**：统一 `empty-text="暂无数据"`  
```diff
- <el-table :data="list">
+ <el-table :data="list" empty-text="暂无数据">
```

#### R003 — BaseTable 缺少空状态文本【中危】
**检测**：`<BaseTable` 没有 `empty-text` 属性  
**标准**：统一 `empty-text="暂无数据"`  
```diff
- <BaseTable :hook="page">
+ <BaseTable :hook="page" empty-text="暂无数据">
```

#### R021 — BaseTable 缺少 AGGrid 渲染模式【高危】
**检测**：`<BaseTable` 没有 `render-type="agGrid"`
**标准**：与 `wl-skills-kit` 页面模板保持一致，所有业务表格必须显式使用 AGGrid 渲染模式
```diff
- <BaseTable :data="list" :columns="columns" />
+ <BaseTable render-type="agGrid" :cid="TABLE_CID" :data="list" :columns="columns" />
```

#### R022 — BaseTable 缺少唯一 cid【高危】
**检测**：`<BaseTable` 没有 `cid` 或 `:cid`
**标准**：每个 BaseTable 必须具备页面内/全局稳定唯一的 cid，推荐 `{pageAbbr}-{base36Timestamp}`，多表追加 `-sub1/-sub2`
```diff
- <BaseTable render-type="agGrid" :data="list" :columns="columns" />
+ <BaseTable render-type="agGrid" :cid="TABLE_CID" :data="list" :columns="columns" />
```

---

### Category B：按钮（el-button）

#### R004 — 操作列使用文字按钮【高危】
**检测**：列定义模板中有 `jh-op-btn` 缺失的操作按钮  
**标准**：操作列必须用 `defaultSlot: ({ row }) => renderOps([...])` 图标按钮系统  

#### R013 — columnsDef 旧格式 operations:[] 文字按钮【高危】
**检测**：script 块中 columnsDef 内有 `operations: [` 旧格式数组（由 scanner/index.mjs 单独检测）  
**标准**：同 R004，改为 `defaultSlot: ({ row }) => renderOps([...])`

**简单迁移（无条件显示）**：
```diff
- { label: '操作', width: 120, operations: [
-   { name: 'view', label: '查看', onClick: (row) => modal.view(row.id) },
-   { name: 'edit', label: '编辑', onClick: (row) => modal.edit(row.id) },
- ]}
+ { label: '操作', width: 100,
+   defaultSlot: ({ row }) => renderOps([
+     { type: 'view', onClick: () => modal.view(row.id) },
+     { type: 'edit', onClick: () => modal.edit(row.id) },
+   ])
+ }
```

**含条件显示的迁移（`show:` 参数直接保留）**：
```diff
- operations: [
-   { name: 'delete', label: '删除', show: () => optr.value !== 'view', onClick: ... },
-   { name: 'view',   label: '详情', show: () => optr.value === 'view',  onClick: ... },
- ]
+ defaultSlot: ({ row }) => renderOps([
+   { type: 'del',  show: () => optr.value !== 'view', onClick: ... },
+   { type: 'view', show: () => optr.value === 'view', onClick: ... },
+ ])
```

**含 Upload / 自定义组件的操作（特殊案例，不能直接用 renderOps）**：  
将 Upload 操作从 operations[] 中抽出，改为 toolbarDef() 中的 `renderNode:` 按钮，操作列仍用 renderOps 承载其他操作。

**标签→type 映射**：查看→`view`，编辑/修改→`edit`，删除/移除→`del`，审核/审批→`ok`，提交→`send`，流程记录→`log`  
**参考**：`reference/ag-cell-renders.ts` - `renderOps` 函数

#### R005 — 工具栏按钮缺少 icon【中危】
**检测**：toolbarDef / 顶部 el-button 没有 `icon` 属性  
**标准**：工具栏按钮必须带 icon + 文字  
```diff
- <el-button type="primary" @click="handleAdd">新增</el-button>
+ <el-button type="primary" icon="Plus" @click="handleAdd">新增</el-button>
```

---

### Category C：表单控件（el-input / el-select / el-date-picker）

#### R006 — el-input / el-select 未统一 size【中危】
**检测**：`<el-input` 或 `<el-select` 没有 `size="small"` 属性  
**标准**：全局统一 `size="small"`  
```diff
- <el-input v-model="form.name" placeholder="请输入">
+ <el-input size="small" v-model="form.name" placeholder="请输入">
```

#### R007 — el-date-picker 宽度未撑满【中危】
**检测**：`<el-date-picker` 没有 `style` 包含 `width:100%`  
**标准**：在 el-form-item 内必须 `style="width:100%"`  
```diff
- <el-date-picker v-model="form.date" type="date">
+ <el-date-picker style="width:100%" v-model="form.date" type="date">
```

#### R008 — el-form labelWidth 不统一【低危】
**检测**：`labelWidth` 小于 150px  
**标准**：统一 `labelWidth="150px"`（最长标签"隐患排查内容及标准"9字=~126px+padding=142px，150px安全兜底）  
**注意**：此规则需人工确认，不自动修改（可能有特殊布局需求）

---

### Category D：状态标签（ElTag）

#### R009 — 状态字段纯文本渲染【高危】
**检测**：column 的 `name` 含 `Status/Level/State` 关键字，但 `defaultNode/defaultSlot` 没有 `renderTagNode` 或 `ElTag`  
**标准**：
- 动态状态（启停/审批/流程）→ `renderTagNode()` / 使用 `COLUMN_AUTO_MAP` 自动映射
- 常用字段直接用 `defineColumns()` 包裹列定义，自动应用：`enableStatus/approvalStatus/riskLevel/permitStatus/trainStatus/credentialStatus/unifyQuestionStatus` 等  
**参考**：`reference/define-columns.ts` COLUMN_AUTO_MAP 完整列表  
**注意**：此规则需人工确认，不自动修复

#### R010 — 分类字段使用填充色 ElTag【中危】
**检测**：`effect` 不是 `"plain"`，但字段语义是分类/归档属性  
**标准**：分类字段统一 `effect="plain"`（outline 风格）  
```diff
- h(ElTag, { type: 'warning' }, () => label)
+ h(ElTag, { type: 'warning', effect: 'plain' }, () => label)
```

---

### Category E：弹窗/分页

#### R011 — 分页组件位置错误【高危】
**检测**：`<pagination` 或 `<Pagination` 出现在 `<template #footer>` 内  
**标准**：分页必须在内容区（el-col 内），footer 只放操作按钮  
**参考**：`reference/SelectPopupCom.vue`

#### R012 — 弹窗内 el-table 缺少空状态【中危】
同 R002，特指弹窗（el-dialog）内的 el-table

#### R014 — selection 列缺少 header-align="center"【中危】
**检测**：`type="selection"` 的列没有 `header-align="center"`
**标准**：必须同时设置 `align="center"` 和 `header-align="center"`，两者缺一都会导致复选框错位
```diff
- <el-table-column type="selection" width="55" fixed="left" align="center">
+ <el-table-column type="selection" width="55" fixed="left" align="center" header-align="center">
```

#### R015 — 弹窗嵌套表格操作列使用文字 el-button【高危】
**检测**：`modal.vue` 文件中，`el-table-column label="操作"` 内使用 `<el-button link>`
**标准**：弹窗内嵌套的 el-table 操作列与主列表操作列风格一致，使用 `jh-op-btn` 图标按钮
```diff
- <el-button size="small" link type="danger" @click="handleDeleteItem(row, $index)">删除</el-button>
+ <button class="jh-op-btn jh-op-del" type="button" title="删除"
+   :disabled="optr === 'view'" @click.stop="handleDeleteItem(row, $index)">
+   <el-icon><Delete /></el-icon>
+ </button>
```
> 支持图标类型：`jh-op-del`（删除）、`jh-op-view`（查看/详情）、`jh-op-edit`（编辑）

#### R016 — `<style>` 块存在硬编码 hex 颜色【中危】
**检测**：`<style>` 块中直接写入已有 CSS Token 对应的 hex 颜色值  
**标准**：使用 CSS 变量代替硬编码，确保品牌色切换生效  
```diff
- color: #4368ff;
+ color: var(--el-color-primary);
- background: #fb2323;
+ background: var(--el-color-danger);
```
**已覆盖颜色**：`#409eff/#3a7afe/#4368ff`→primary，`#fb2323/#f56c6c`→danger，`#0cc859/#67c23a`→success，`#ffaf27/#e6a23c`→warning，`#ecf5ff`→primary-light-9

#### R017 — 编号/工号/证件号列缺少 renderBadge【高危】
**检测**：`columnsDef()` / `columns` 数组中，label 含“编号”“工号”“证件号”但没有 `renderBadge` / `defaultSlot`（脚本式列定义）  
**标准**：所有标识符类字段（射5类）必须使用 `renderBadge(row.xxx)`，包括：  
- label 含“编号”：门岗编号、主机编号、通道编号…  
- label 含“工号”：上报人工号、处置人工号…  
- label 含“证件号”：证件号码、驾驶员证件号码、车主证件号码…  
```diff
- { label: "工号", name: "userNo", minWidth: 100 }
+ { label: "工号", name: "userNo", minWidth: 100,
+   defaultSlot: ({ row }) => renderBadge(row.userNo) }
- { label: "证件号码", name: "identityNo", minWidth: 180 }
+ { label: "证件号码", name: "identityNo", minWidth: 180,
+   defaultSlot: ({ row }) => renderBadge(row.identityNo) }
```
> **答疑解惑：证件号码要用 badge 吗？** 是的。证件号码是唧18位的唯一标识字符串，badge 的等宽字体让长串数字更易辨识，视觉上传达“这是个标识码”的语义。

#### R018 — `logicType:dict` 列缺少 defaultSlot【高危】
**检测**：`columnsDef()` / `columns` 中某列有 `logicType: BusLogicDataType.dict`，但没有 `defaultSlot` / `renderTag` / `renderDictClassifyTag`（脚本式列定义）  
**标准**：`logicType:dict` 仅提供字符串渲染，必须换为标签渲染：  
```diff
- { name: "trainLevel", label: "培训级别",
-   logicType: BusLogicDataType.dict, logicValue: "trainLevel" }
+ { name: "trainLevel", label: "培训级别", width: 100,
+   defaultSlot: ({ row }) => renderDictClassifyTag(row.trainLevel, 'trainLevel', TYPE_MAP) }
- { name: "authStatus", label: "权限状态",
-   logicType: BusLogicDataType.dict, logicValue: "authStatus" }
+ { name: "authStatus", label: "权限状态", width: 100,
+   defaultSlot: ({ row }) => renderDictClassifyTag(row.authStatus, 'authStatus') }
```
**判断原则**：字段名含 `Type/Level/Kind` → `renderDictClassifyTag`（分类）；含 `Status/State/Flag` → `renderTagNode`（状态）

---

## 四、labelWidth 选取建议

| 最长标签字数 | 建议 labelWidth |
|---|---|
| ≤5字（如"创建时间"）| 100px |
| 6~7字（如"厂级单位名称"）| 120px |
| 8~9字（如"隐患排查内容及标准"）| **150px**（推荐统一值）|
| ≥10字 | 180px（特殊表单单独处理）|

**当前统一标准：150px**（能安全覆盖本系统内所有已知标签，避免换行错落）

---

## 五、参考实现路径

| 标准实现 | 参考文件 |
|---|---|
| AG Grid 列渲染（状态/badge/ops）| `runtime/core/renderers.ts` / `reference/ag-cell-renders.ts` |
| 业务列定义自动化 + COLUMN_AUTO_MAP | `runtime/core/registry.ts` 中 `defineColumns` |
| 通用业务枚举与 `installCommonPreset()` | `runtime/presets/common.ts` |
| 选择弹窗完整实现 | `reference/SelectPopupCom.vue` |
| CSS Token 变量（品牌色等）| `design/tokens/base.css`（业务侧 `<link>` 引入）|
| Element Plus 全局覆盖 | `styles/element/`（业务侧 `@use '@agile-team/wk-skills-ui/styles' as *`）|
| Vendor 封装组件样式（树/分页/搜索/AG Grid）| `styles/vendors/_*.scss` |
| Portal 视觉增强（可选）| `styles/vendors/_portal.scss` |

**COLUMN_AUTO_MAP 已覆盖字段（defineColumns自动生效）**：

| 字段名 | 渲染效果 |
|---|---|
| `enableStatus` | 启用=绿/停用=红 Tag |
| `approvalStatus` | 审批状态 Tag |
| `verifyStatus` | 核实状态 Tag |
| `riskLevel` | 风险分级 Tag |
| `taskStatus` | 排查任务状态 Tag |
| `planStatus` | 计划状态 Tag |
| `flagNormal` | 正常/异常 Tag |
| `riskStatus` | 隐患状态 Tag |
| `correctStatus` | 整改状态 Tag |
| `permitStatus` | 危险作业票状态 Tag（草稿/待审批/作业中/已完工/已撤销） |
| `trainStatus` | 培训状态 Tag（未完成/已完成） |
| `credentialStatus` | 证书状态 Tag（有效/即将过期/已过期） |
| `unifyQuestionStatus` | 题库状态 Tag（草稿/已发布/已停用） |
| `riskNo` | 蓝色圆角徽标 |
| `ratingLevel` | 彩色圆形徽标 |

**新增内容（最近改造积累）**：

| 字段名 | 渲染效果 |
|---|---|
| `drillType` | 演练方式 Tag（桌面=灰/实战=橙） |
| `coursewareType` | 课件类型 Tag |
| `trainLevel` | 培训级别 Tag |
| `planType` | 预案分类 Tag |
| `planNo` / `fileNo` / `userNo` | 蓝色编号徽标 |
| `baseCount` / 数值类 | 绿色数值徽标 |
| `evaluateStandard` / 警示文字类 | 红色字体 |

---

## 六、无法自动修复的规则（需 AI 辅助人工确认）

| 规则 | 原因 |
|---|---|
| R008 labelWidth | 可能有特殊布局需求，修改前需看表单 |
| R009 状态字段 | 需要识别业务语义，无法纯正则判断 |
| R010 分类 vs 状态 | 需结合字段业务含义判断 |
| R013（含 Upload/二维码等特殊操作） | Upload 组件嵌入 operations[] 时需抽离到 toolbarDef renderNode，不能直接自动迁移 |

对这类规则，AI 的职责是：**标注疑似问题 + 给出建议 + 等待用户逐条确认**，而不是直接修改。

---

## 七、执行约束

1. **Phase 3 用户确认是强制门槛**，未确认不得修改文件
2. **每次只修改一类规则**，修改后立即验证该类归零再继续下一类
3. **不修改以下路径**：`node_modules/`、`dist/`、`*.min.js`、已手动精细调整的文件（需用户标注）
4. **幂等性**：脚本可重复运行，已符合标准的不会被二次修改

---

## 八、新系统快速接入方案（推荐）

对于**全新业务系统**，使用本方案可让所有业务页面从第一行代码就符合风格标准，彻底无需事后补丁。

> 详细接入步骤见 [README — 快速开始](../README.md#快速开始)，以下仅列核心要点。

### 核心三步

```bash
pnpm add @agile-team/wk-skills-ui
```

```html
<!-- index.html <head> 最先加载 -->
<link rel="stylesheet" href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css" />
```

```scss
@use '@agile-team/wk-skills-ui/styles' as *;
```

```ts
// src/main.ts
import { installCommonPreset } from '@agile-team/wk-skills-ui/runtime/common-preset';
installCommonPreset();
```

### 列定义用 defineColumns() 包裹

```typescript
// 每个业务文件 columnsDef() 末尾：
import { defineColumns, renderOps } from '@agile-team/wk-skills-ui/runtime';

columnsDef(): TableColumnDesc<any>[] {
  return defineColumns([
    { label: '名称', name: 'name' },
    { label: '状态', name: 'enableStatus' },        // 自动渲染彩色Tag
    { label: '风险分级', name: 'riskLevel' },         // 自动渲染Tag
    { label: '操作', width: 100,
      defaultSlot: ({ row }) => renderOps([
        { type: 'view', onClick: () => modal.view(row.id) },
        { type: 'edit', onClick: () => modal.edit(row.id) },
        { type: 'del',  onClick: () => handleDel(row.id) },
      ])
    },
  ]);
}
```

### 8.2 能保证的效果

| 功能项 | 保证方式 |
|---|---|
| 状态列彩色 Tag | `defineColumns` COLUMN_AUTO_MAP 自动配置 |
| 操作列图标按钮 | `renderOps([...])` 统一渲染系统 |
| 操作列条件显示 | `show: condition` 替代 `disabled: (row) => !condition` |
| 自动分隔线 | 图标组与文字组之间 `renderOps` 自动插入 |
| 点击阻止冒泡 | `renderOps` 内部自动 `e.stopPropagation()` |

### 8.3 不在 defineColumns 范围内、需手动保证的

| 功能项 | 标准做法 |
|---|---|
| BaseTable `empty-text` | 每个 `<BaseTable>` 加 `empty-text="暂无数据"` |
| el-form `labelWidth` | 统一 `labelWidth="150px"` |
| 弹窗内控件 `size` | `el-input/el-select` 加 `size="small"` |
| el-date-picker 宽度 | 加 `style="width:100%"` |
| 输入框圆角 | 已在 `element.scss` 全局设置 `border-radius: 6px`，**无需各 modal 单独处理** |
| 弹窗嵌套表格操作列 | 使用 `jh-op-btn` 图标按钮（见 R015），不得用 `el-button link` |
| selection 列对齐 | `align="center"` + `header-align="center"` 必须同时设置（见 R014）|

上述 4 项运行扫描器（Phase 1）可自动检测，R002/R003/R006/R007/R008 规则覆盖。

### 8.4 新增业务专属状态字段

当新系统有自己的状态字段时，按此模式扩展 `ag-cell-renders.ts` + `define-columns.ts`：

```typescript
// ag-cell-renders.ts — 追加新状态映射
export const MY_STATUS_MAP: Record<string | number, TagMapItem> = {
  "0": { label: "待处理", type: "info" },
  "1": { label: "处理中", type: "warning" },
  "2": { label: "已完成", type: "success" },
  "3": { label: "已驳回", type: "danger" },
};
export const renderMyStatus = (v) => renderTagNode(v, MY_STATUS_MAP);

// define-columns.ts — 追加到 COLUMN_AUTO_MAP
myStatus: {
  width: 90, fixed: "right",
  defaultNode: ({ row }) => renderMyStatus(row.myStatus)
},
```

新增后，所有含 `name: 'myStatus'` 的列，用 `defineColumns()` 包裹后自动生效，全项目一次性覆盖。

---

## 九、枚举/状态/分类/编号统一展示规范

> 本规范源于企业系统全量改造积累，解决"每次发现、每次手动追加"的痛点。
> 凡是表格列，遇到 **枚举值**，必须按下表分类选择渲染函数，禁止纯文本展示。

### 9.1 三类字段 → 三种渲染方式

| 字段类别 | 典型字段 | 视觉效果 | 渲染函数 | Tag 风格 |
|---|---|---|---|---|
| **状态类**（二元/流转） | enableStatus、approvalStatus、verifyStatus、credentialStatus | 实心彩色 Tag | `renderXxxStatus(value)` / `renderTagNode(value, MAP)` | `effect="dark"` 或默认 |
| **分类/级别类**（组织/归档属性） | coursewareType、trainLevel、planType、checkLevel、riskLevel、drillType | 镂空 outline Tag | `renderClassifyTag(value, MAP)` / `renderDictClassifyTag(value, dictKey, colorMap?)` | `effect="plain"` |
| **编号/代码类** | planNo、fileNo、userNo、riskNo | 蓝色圆角徽标 | `renderBadge(value)` | `.jh-riskno-badge` |
| **数值型**（考核基数/评分/权重） | baseCount、score、weight | 绿色圆角徽标 | `renderCountBadge(value)` | `.jh-count-badge` |
| **警示文本型**（考评标准/扣分依据） | evaluateStandard、deductReason | 红色字体 #f56c6c | `renderDangerText(value)` | `color: #f56c6c` |

#### 状态类颜色语义（强制规范）

| 状态含义 | ElTag type | 例子 |
|---|---|---|
| 正常 / 有效 / 已完成 / 启用 | `success`（绿） | 已启用、证书有效、已完工 |
| 警告 / 临时 / 待处理 / 即将过期 | `warning`（橙） | 即将过期、待审批 |
| 停用 / 驳回 / 已过期 / 危险 | `danger`（红） | 已停用、审批驳回、证书过期 |
| 草稿 / 未开始 / 中性 | `info`（灰） | 草稿、未处理 |
| 主流程默认状态 | `""`（蓝） | 作业中、处理中 |

#### 分类/级别类颜色建议（非强制，可根据业务调整）

| 等级/类别含义 | 建议 type |
|---|---|
| 最高级 / 综合 / 默认 | `""`（蓝）|
| 次级 / 专项 | `warning`（橙）|
| 基层 / 现场 / 细分 | `info`（灰）|

### 9.2 分类字段：静态 map vs 动态字典

**情况一：字典项目固定，前端已知所有枚举值**

使用 `renderClassifyTag(value, MAP)` — 静态 map，label 直接写在代码里：

```typescript
// ag-cell-renders.ts 新增：
export const COURSEWARE_TYPE_MAP = {
  "1": { label: "视频", type: "" },
  "2": { label: "文档", type: "info" },
};
export const renderCoursewareType = (v) => renderClassifyTag(v, COURSEWARE_TYPE_MAP);

// columnsDef() 中使用：
{ name: "coursewareType", label: "课件类型", width: 90, align: "center",
  defaultSlot: ({ row }) => renderCoursewareType(row.coursewareType) }
```

**情况二：字典项目由后端配置，前端通过 businessLogicDataStore 动态获取**

使用 `renderDictClassifyTag(value, dictKey, colorMap?)` — 动态取 label，只需提供颜色映射：

```typescript
// 颜色映射（只需 value → type，无需写 label）
export const TRAIN_LEVEL_TYPE_MAP: Record<string, string> = {
  "1": "",          // 公司级（蓝）
  "2": "warning",   // 部门/厂级（橙）
  "3": "info",      // 班组/车间级（灰）
  "4": "info",      // 岗位级（灰）
};

// columnsDef() 中使用：
import { renderDictClassifyTag, TRAIN_LEVEL_TYPE_MAP } from "@/util/ag-cell-renders";

{ name: "trainLevel", label: "培训级别", width: 100, align: "center",
  defaultSlot: ({ row }) => renderDictClassifyTag(row.trainLevel, 'trainLevel', TRAIN_LEVEL_TYPE_MAP) }
```

`renderDictClassifyTag` 内部通过 Pinia `businessLogicDataStore.get(key)` 取 label，异步加载完成后 Vue 自动重渲染，无需额外处理。

### 9.3 已有颜色映射常量（直接复用）

以下常量已定义在 `src/util/ag-cell-renders.ts`，无需重新定义：

| 常量名 | 用途 | 适用场景 |
|---|---|---|
| `COURSEWARE_TYPE_MAP` | 课件类型（视频/文档），静态map | `renderClassifyTag(v, COURSEWARE_TYPE_MAP)` |
| `TRAIN_LEVEL_TYPE_MAP` | 培训级别颜色方案 | `renderDictClassifyTag(v, 'trainLevel', TRAIN_LEVEL_TYPE_MAP)` |
| `PLAN_TYPE_COLOR_MAP` | 预案分类颜色方案 | `renderDictClassifyTag(v, 'planType', PLAN_TYPE_COLOR_MAP)` |
| `DRILL_TYPE_COLOR_MAP` | 演练方式颜色方案（桌面=灰/实战=橙） | `renderDictClassifyTag(v, 'drillType', DRILL_TYPE_COLOR_MAP)` |

**独立渲染函数（无需 MAP 参数）**：

| 函数名 | 用途 | CSS 类 |
|---|---|---|
| `renderCountBadge(value)` | 数值型徽标（绿色系） | `.jh-count-badge` |
| `renderDangerText(value)` | 警示文本（红色字体 #f56c6c） | 内联 style |

> **参考文件同步规则**：`@agile-team/wk-skills-ui/reference/ag-cell-renders.ts` 与业务项目中的 `src/util/ag-cell-renders.ts` 保持语义同步。每次在业务项目新增渲染函数后，同步更新 reference 文件，保证 skills 工具链对新项目的指导准确性。

### 9.4 迁移规则（logicType 列改造）

**凡是使用 `logicType: BusLogicDataType.dict` 且语义是分类/级别的列，必须改为 `renderDictClassifyTag`**。

```typescript
// ❌ 旧写法 — 纯文本，无视觉区分
{ name: "trainLevel", label: "培训级别",
  logicType: BusLogicDataType.dict, logicValue: "trainLevel" }

// ✅ 新写法 — 镂空彩色 Tag
{ name: "trainLevel", label: "培训级别", width: 100, align: "center",
  defaultSlot: ({ row }) => renderDictClassifyTag(row.trainLevel, 'trainLevel', TRAIN_LEVEL_TYPE_MAP) }
```

判断原则：
- 字段名含 `Type/Level/Kind/Class/Category` → **分类类** → `renderDictClassifyTag`
- 字段名含 `Status/State/Flag` → **状态类** → `renderXxxStatus` 或 `renderTagNode`
- 字段名含 `No/Code/Id`（非主键） → **编号类** → `renderBadge`

> **补充说明：以下 label 含“中文关键字”的字段同样适用 `renderBadge`，字段名不含 No/Code 也不例外：**
>
> | label 关键字 | 典型字段名 | 正确处理 |
> |---|---|---|
> | 编号 | `gateCode`, `hostCode`, `passagewayCode` | `renderBadge` |
> | 工号 | `userNo`, `workNo`, `employeeNo` | `renderBadge` |
> | 证件号码 | `identityNo`, `idCardNo`, `certNo` | `renderBadge` |
> | 设备编号/车牌号 | `deviceCode`, `carNo` | `renderBadge` |
> | 驾驶员证件号码 | `driverIdNo` | `renderBadge` |
>
> **采用 `renderBadge` 而非普通文本的原因**：等宽字体让长串数字（如 18 位身份证）更易辨识，蓝色边框视觉传达“标识符”语义。

### 9.5 selection 列对齐（嵌套 el-table 同样适用）

```typescript
// ✅ 标准写法（外层 BaseTable 和弹窗内嵌套 el-table 均适用）
<el-table-column type="selection" width="55" fixed="left" align="center" header-align="center" />
```

- `width` 必须为 **55**（42 会导致表头复选框溢出错位）
- `align` 和 `header-align` 必须**同时**设置为 `center`
