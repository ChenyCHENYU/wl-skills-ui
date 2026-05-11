# Skills Registry — wl-skills-ui v1.3

> 全部可被 AI 编辑器加载的 skill 索引，按 5 层架构组织。

## 五层架构总览

```
L0 tokens   → 设计令牌（颜色/间距/圆角/字号）
L1 element  → Element Plus 控件对齐
L2 vendors  → 封装组件化妆（Base / jh / C_/c_ / custom + AG Grid）
L3 layouts  → 团队约定页面骨架
L4 runtime  → 业务渲染 API（defineColumns / renderOps / preset）
```

## 入口（Flows · 组合流程）

| Flow                                                            | 适用                 |
| --------------------------------------------------------------- | -------------------- |
| [\_flows/new-project-init](../_flows/new-project-init.md)       | 新项目从零接入       |
| [\_flows/legacy-skin-align](../_flows/legacy-skin-align.md)     | 老项目化妆模式       |
| [\_flows/full-audit](../_flows/full-audit.md)                   | 全量审计（不修）     |
| [\_flows/progressive-migrate](../_flows/progressive-migrate.md) | 渐进式迁移到 runtime |

## 单点 Skills（按层）

### L1 element/

| Skill                    | 处理规则                                                 |
| ------------------------ | -------------------------------------------------------- |
| element/el-table         | R001 R002 R003 R014                                      |
| element/el-form          | R006 R007 R008                                           |
| element/el-dialog        | R011 R015                                                |
| element/el-tag           | R009 R010                                                |
| element/component-family | R031-R037，首批 B 端高频 Element Plus 组件族聚合治理入口 |
| element/el-card          | 卡片容器、详情卡片、统计卡片样式管控                     |
| element/el-tabs          | Tab 详情页、配置页、主从切换样式管控                     |
| element/el-descriptions  | 详情页、只读展示区样式管控                               |
| element/el-tree          | 左树右表、组织树、区域树样式管控                         |
| element/el-drawer        | 抽屉详情、抽屉编辑样式管控                               |
| element/el-upload        | 附件上传、图片上传、文件列表样式管控                     |
| element/el-steps         | 审批流、流程状态样式管控                                 |
| element/el-overlay       | popover/tooltip/dropdown 弹层样式管控                    |
| element/el-navigation    | menu/breadcrumb 导航样式管控                             |
| element/el-feedback      | empty/result/alert/badge/timeline 反馈样式管控           |

### L2 vendors/

| Skill                   | 优先级 | 说明           |
| ----------------------- | ------ | -------------- |
| vendors/base-table      | #1     | Base\* 系列    |
| vendors/jh-components   | #2     | jh-\* 系列     |
| vendors/c-components    | #3     | C*/c* 前缀     |
| vendors/custom-wrappers | #4     | 兜底（无前缀） |
| vendors/unknown-wrapper | —      | 兜底探测       |
| vendors/ag-grid         | —      | AG Grid        |

### L3 layouts/

| Skill               | 说明                                      |
| ------------------- | ----------------------------------------- |
| layouts/list-page   | 列表页骨架（搜索 + 工具栏 + 表格 + 分页） |
| layouts/tree-list   | 左树右表双栏骨架（含 jh-drag-col）        |
| layouts/form-dialog | 新增/编辑/详情三态表单弹窗                |
| layouts/detail-page | 只读展示页（el-descriptions 为主）        |

### L4 runtime/

| Skill                 | 说明                         |
| --------------------- | ---------------------------- |
| runtime/style-align   | 主样式对齐 skill（聚合入口） |
| runtime/design-tokens | R016 R017 R018 颜色 token    |
| runtime/migration     | 从零迁入 / 渐进迁移指南      |

### Ops/

| Skill              | 用途                                                 |
| ------------------ | ---------------------------------------------------- |
| ops/scan           | 扫描诊断                                             |
| ops/fix            | 自动修复                                             |
| ops/audit          | 只读全量审计 + 报告                                  |
| ops/migrate        | 渐进迁移（skin → native）                            |
| ops/route-intent   | 自然语言意图识别，推荐 flow/tool/skill               |
| ops/recommend-flow | 根据扫描 JSON 推荐 nextActions 与 wl-skills-kit 桥接 |

## 多编辑器适配

详见 [`_compat/README`](../_compat/README.md)：支持 GitHub Copilot / Cursor / Windsurf / Kiro / Trae。

## 扩展机制

新增 skill 步骤：

1. 在对应 layer 目录建子目录 + `SKILL.md`
2. 更新本文件索引
3. 必要时更新 `_detection.md` 识别表
4. 必要时更新 `scanner/rules/` 规则（带 layer + vendor 元数据）
