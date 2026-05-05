---
description: |
  新项目原生接入流程 — 从零搭建一个符合团队规范的 Vue + Element Plus 项目。
  接入完整 5 层（tokens + element + vendors + layouts + runtime），最大化业务代码精简。
applyTo: "**/*.{vue,ts,scss,html}"
---

# Flow: new-project-init

> 原生模式（Native Mode）— 完整接入

## 触发短语

- "用 wk-ui 给新项目接入"
- "new-project 流程跑一下"
- "native mode 完整接入"

## 执行步骤

### Phase 0 — 安装/更新 Skill 与 MCP 配置
```bash
npx wk-ui init --project . --mode native
npx wk-ui doctor --project .
```

该命令会写入 AI 编辑器规则、触发提示、`.mcp.json` 和 `.wk-skills-ui-manifest.json`。已安装项目可改用 `npx wk-ui update --project .`。



### Phase 1 — 安装包
```bash
pnpm add @agile-team/wk-skills-ui
```

### Phase 2 — 注入 tokens
`index.html` `<head>`：
```html
<link rel="stylesheet" href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css" />
```

### Phase 3 — 接入完整样式
`src/styles/index.scss`：
```scss
@use '@agile-team/wk-skills-ui/styles' as *;   // 等价于 presets/full
```

### Phase 4 — 接入 runtime
`src/main.ts`：
```ts
import { installCommonPreset } from '@agile-team/wk-skills-ui/runtime/common-preset';
installCommonPreset();
```

### Phase 5 — 使用模板生成第一个页面
- 列表页：参考 `templates/list-page/TPL-LIST.md`
- 表单弹窗：参考 `templates/form-dialog/TPL-FORM-DIALOG.md`
- 左树右表：参考 `templates/tree-list/TPL-TREE-LIST.md`
- AG Grid 页：参考 `templates/ag-grid-page/TPL-AG-GRID.md`

### Phase 6 — 业务定制 preset（按需）
```bash
npx wk-ui add-preset my-biz
# 生成 runtime/presets/my-biz.ts，自定义业务字段映射
```

### Phase 7 — CI 接入
`package.json` `scripts`：
```json
{
  "ui:check": "wk-ui check --project .",
  "ui:fix":   "wk-ui fix --target src --dry-run"
}
```

## 完成后

新项目应做到：
- 业务代码不写颜色硬编码（用 CSS 变量）
- 列表页用 `defineColumns()` + `renderOps()` 风格
- 控件全部用 `size="small"`、日期 `width:100%`、表单 `label-width="150px"`
