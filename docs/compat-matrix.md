# 项目-依赖适配矩阵

> 单一事实源，集团项目集群推荐版本与 wl-skills-ui 适配关系。  
> scanner / MCP / Skill 文档统一从本表派生。

## 推荐版本（集团内推荐组合）

| 依赖 | 推荐版本 | 说明 |
|---|---|---|
| `vue` | `~3.2.25` 或 `^3.2.25` | 与项目集群保持一致 |
| `element-plus` | **`2.2.6-prod.3`** | 集团 jh- 定制版，搭配 `@jhlc/jh-ui` 使用，DOM 仍为 `.el-input > .el-input__inner` 直挂结构（**EP 2.3.0 起才引入 `.el-input__wrapper`**） |
| `@jhlc/jh-ui` | **`3.1.0`** | SCSS 皮肤包，`.com-text` label 包裹、`.has-colon ::after` 冒号注入、`.el-form-item--default { margin-bottom: 24px }` 等强约束 |
| `@jhlc/common-core` | `3.1.0` 或 `3.1.0-prod.x` | 基础 util/types，`@jhlc/jh-ui` 间接依赖 |
| `@agile-team/wl-skills-ui` | `^1.7.0` | 已对齐 jh-ui 3.1.0 + EP 2.2.6-prod.3 的 DOM 假设 |

## 项目集群当前实测

| 项目 | element-plus | @jhlc/jh-ui | 适配状态 |
|---|---|---|---|
| `wl-ui-sale` | `2.2.6-prod.3` | `3.1.0` | ✅ 推荐组合 |
| `wl-ui-public` | `2.2.6-prod.3` | `3.1.0` | ✅ 推荐组合 |
| `wl-ui-safe` | `2.2.6-prod.3` | `3.1.0` | ✅ 推荐组合 |
| `wl-ui-security` | `2.2.6-prod.3` | `3.1.0` | ✅ 推荐组合 |
| `wl-mdata` | `2.2.6-prod.3` | — | ⚠️ 仅 `@jhlc/common-core`，未装 jh-ui，本表 jh-ui 相关规则不生效 |

## EP 2.2.x vs EP 2.3+ DOM 差异（适配关键依据）

| 维度 | EP 2.2.x（jh-ui 配套） | EP 2.3+（社区主流） |
|---|---|---|
| 输入控件 | `.el-input > .el-input__inner` | `.el-input > .el-input__wrapper > .el-input__inner` |
| focus 标志 | `.el-input.is-focus` / `.el-input__inner:focus` | `.el-input__wrapper.is-focus` / `:focus-within` |
| select | `.el-select .el-input > .el-input__inner` | `.el-select__wrapper` |
| 错误态 | `.el-form-item.is-error .el-input__inner` | `.el-form-item.is-error .el-input__wrapper` |
| 表单 label | jh-ui 注入 `<span class="com-text">` 包裹文本 | EP 默认直接渲染文本节点 |

## 适配建议

- 集团内项目：**统一锚定 `element-plus@2.2.6-prod.3` + `@jhlc/jh-ui@3.1.0`**，与 wl-skills-ui v1.7.0 三方对齐。
- 升级 `element-plus` 到 2.3+ 前，必须同步升级 `@jhlc/jh-ui` 到对应支持版本，否则 `.com-text` / `.el-input__inner` DOM 与 EP `__wrapper` 体系不兼容。
- 新项目接入：见 README 「快速接入」章节，默认会按本表声明 peerDependency 范围。

## 维护流程

- 推荐版本字段统一在 `skills/_meta/_compat/vendors.json` 的 `vendors[id=jh].compat` 字段。
- 本文档由 `scripts/check-docs.mjs` 校验：版本号必须与 `vendors.json` 一致，避免漂移。
- scanner `I005` 接入完整性检查会按本表校验消费方项目是否使用推荐组合。
- MCP 工具 `wl_ui_detect_skin` 直接读取消费方 `package.json` 给 AI 返回结构化结果。
