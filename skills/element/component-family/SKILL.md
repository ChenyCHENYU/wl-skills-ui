# Skill: element/component-family

## 定位

用于治理 Element Plus 首批 B 端高频组件族的统一视觉，包括 card、tabs、descriptions、tree、drawer、upload、steps、overlay、navigation、feedback。

核心原则：wk-skills-ui 优先保证样式绝对管控。无论项目使用纯 `el-*`、老旧封装、Base*/jh*/C_*，还是 wl-skills-kit 最佳写法，都先通过 L1/L2 样式层统一视觉，再按需引导规范化重构。

## 覆盖组件

| 组件族 | 标签 | 典型场景 |
|---|---|---|
| card | `el-card` | 列表容器、详情卡片、统计卡片 |
| tabs | `el-tabs` `el-tab-pane` | 详情页 Tab、配置页 Tab、主从信息切换 |
| descriptions | `el-descriptions` | 只读详情、字段展示 |
| tree | `el-tree` | 左树右表、组织树、区域树 |
| drawer | `el-drawer` | 抽屉详情、抽屉编辑 |
| upload | `el-upload` | 附件上传、图片上传、文件列表 |
| steps | `el-steps` `el-step` | 审批流、流程状态 |
| overlay | `el-popover` `el-tooltip` `el-dropdown` | 辅助说明、溢出提示、更多操作 |
| navigation | `el-menu` `el-breadcrumb` | 导航、面包屑 |
| feedback | `el-empty` `el-result` `el-alert` `el-badge` `el-timeline` | 空状态、异常状态、提示反馈 |

## 扫描规则

| Rule | 含义 |
|---|---|
| R031 | `el-card` 建议标识 detail-card/stat-card/wk-card 等场景 class |
| R032 | `el-tabs` 建议标识 detail-tabs/config-tabs/wk-tabs 等场景 class |
| R033 | `el-descriptions` 建议使用 border 或统一详情容器 |
| R034 | `el-drawer` 建议明确 size |
| R035 | `el-upload` 建议配置 accept/limit/tip |
| R036 | `el-steps` 建议明确 active/process-status/finish-status |
| R037 | `el-empty` / `el-result` / `el-alert` 建议提供统一操作入口 |

## B 端业务场景识别

扫描报告的 `componentCoverage.businessScenarios` 会识别：

- `query-table`：查询区 + 表格
- `toolbar-actions`：工具栏 / 批量操作栏
- `tree-table`：左树右表
- `dialog-form`：弹窗表单
- `drawer-detail`：抽屉详情 / 抽屉编辑
- `detail-card`：详情卡片
- `tab-workbench`：Tab 工作台 / Tab 详情
- `attachment-upload`：附件上传
- `process-flow`：流程 / 审批
- `feedback-state`：空状态 / 异常状态

## AI 使用流程

1. 识别当前页面是否命中上述组件族。
2. 优先确认项目是否加载 `@agile-team/wk-skills-ui/styles` 或 `styles/presets/skin`。
3. 运行 `wks_ui_scan --output json` 获取 `componentCoverage`。
4. 如果只是视觉不统一，优先使用 wk-skills-ui 样式层解决。
5. 如果扫描结果提示页面结构、BaseTable、renderOps 等规范问题，再桥接 wl-skills-kit。

## 推荐 MCP

- `wks_ui_route_intent`：根据用户自然语言判断组件族和治理流程。
- `wks_ui_scan`：只读扫描并输出组件覆盖。
- `wks_ui_recommend_flow`：根据扫描 JSON 推荐下一步。
- `wks_ui_fix_dry_run`：修复前预览，不直接写入。

## 执行约束

- 不为了样式统一强制改业务结构。
- 不把老项目强制迁移到 wl-skills-kit。
- 不直接删除项目已有封装。
- 修复前必须先 dry-run 并给用户确认。
