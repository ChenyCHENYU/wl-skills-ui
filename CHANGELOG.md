# Changelog

All notable changes to **@agile-team/wl-skills-ui** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.10.4] - 2026-08-22

### Fixed

- 统一新旧 Element Plus/jh-ui 输入控件的左右内边距，包含 placeholder、textarea、picker 和复合输入结构，避免内容贴边。
- 统一普通与 jh 复合数字输入框步进按钮的右侧上下布局、尺寸、分隔线和 hover 状态，避免箭头错位。
- 增加输入间距与数字控件几何回归契约测试。

## [1.10.3] - 2026-08-16

### Added

- 新增 R041 按钮尺寸扫描规则：`el-button` / `ElButton` / `BaseToolbar` 无显式 `size` 时报告 warning，默认建议 `small`；不自动修改，不覆盖显式其他或动态尺寸。
- 新增 `runtime/ag-grid-empty-state`：测量 AG Grid 真实数据区并为完整空态保留 160px；支持上下/左右分屏受控撑高、动态挂载、Resize 合并、豁免区和卸载清理。
- 新增完整空态 Node 行为测试与浏览器视觉基准，覆盖单层/分组表头、上下双空表滚动、数据区中心误差和数据恢复清理。

### Fixed

- 精准修正旧新 Element Plus MessageBox 状态图标定位差异，仅命中容器直属状态图标结构。
- `jh-input-number` 内层文本起始位恢复 11px 间距，不改右侧步进按钮、单位和对齐配置。
- AG Grid 编辑单元格仅退出普通文本 padding；列 `align/headerAlign` 改为函数式 `cellStyle/cellClass` 桥接，合并业务已有配置并使表头与内容共轴。
- AG Grid 空态不再相对整张 Grid 居中或依赖 `top:36px/72px` 猜表头；插图、主文案和辅助说明始终完整同规格，低高度多表格不再压盖表头。

## [1.10.2] - 2026-08-15

### Fixed

- `AUTO_STATUS_RULES` 匹配纪律收紧（语义正确性，零性能开销）：
  - 单字词锚定——`^待` / `^(?:无|否|未)$`，业务文案「招待费」「无票运输」「未税」不再被误判为状态 Tag；
  - 「未X」词表先行拦截（未通过=danger / 未完成·未启用等=info），防止 success 组的 完成/通过/启用/达标 子串反向误命中「未完成/未通过」；
  - 刻意不使用后行断言（旧 Safari 解析期报错，库代码不可引入）。
- `docs/governance-long-term.md` 修正 `.wl-exempt.example.json` 陈旧根路径为实际发布路径 `examples/`。

### Added

- `npm run test:coverage`：Node 内建 `--experimental-test-coverage` 覆盖率报告（零新增依赖，仅报告不设门禁）。
- `publish.yml` 发布工作流（GitHub Release 触发：tag-版本一致性校验 + verify + pack 预检 + npm publish）；视觉回归因快照基线为 win32 平台专属暂不入 Linux 发布路径，跨平台基线补齐后再追加。

## [1.10.1] - 2026-08-15

### Fixed

- `ensureDefaultAlignment` 分组列语义修正：声明式分组（带 `children`）只递归子列，不再给分组自身补 `align/headerAlign`（分组行无叶子单元格，补齐语义多余）。

### Added

- 新增 `runtime/__tests__`（25 用例）：`ensureDefaultAlignment` / `normalizeColumnAlignmentsWith`（默认居中、属性退出、cellStyle/headerClass 尊重、分组递归、不变突变）与 `autoTagTypeByLabel` / `renderAutoTagByLabel` / `renderAutoTag`（语义分级、危险词优先、镂空分类、中性纯文本兜底、resolver 注入）；`npm test` 统一纳管 runtime 测试。
- `verify:package` 新增 `dist/tokens.css` ↔ `design/tokens/base.css` 逐字节同步守卫（防陈旧产物发布；该文件被 git 跟踪以保护 `npm pack` 完整性，忽视规则会导致打包缺文件）。
- 新增 GitHub Actions CI（`ci.yml`）：Ubuntu Node 22/24 + Windows Node 24 矩阵，`pnpm install --frozen-lockfile` + `pnpm verify` + `npm pack --dry-run`，与 wl-skills-kit 的 CI 对齐。

### Changed

- 仓库卫生：删除根目录 3 个历史 tgz 产物与 `.tmp` / `test-results` 空目录；新增 `mcp/README.md` 声明 `server.js` 冻结（2026-05 遗留实验实现，勿基于其扩展）。

## [1.10.0] - 2026-08-15

> 来源：wl-ui-ep（危废/环保子系统）存量改造实战沉淀，全部经过"线上翻车 → 定位 → 修复 → 验证"闭环。

### Added

- 新增 `renderAutoTag(value, dictKey, fieldName?)` / `renderAutoTagByLabel(label, fieldName?)` 文案语义自动判色 Tag：按字典渲染出的文案关键词判色（状态词实心 Tag、分类/形态词镂空 Tag、中性词原样纯文本兜底），零配色表覆盖存量项目上百字典列；规则表 `AUTO_STATUS_RULES` / `AUTO_CLASSIFY_RULES` / `autoTagTypeByLabel` 同步导出可扩展。
- 新增 `ensureDefaultAlignment` / `normalizeColumnAlignmentsWith(cols, { defaultAlign: "center" })` 默认对齐补齐：无显式 `align/cellStyle/headerClass` 的列补默认居中（含表头 class 桥接，兼容共享 AG 适配层只认 class 的场景），递归分组 children；不传 options 保持原有"仅桥接显式声明"行为，向后兼容。
- 新增规范文档 `standards/ui/06-legacy-migration-lessons.md`：二级表头、滚动条双轨、默认居中、状态 Tag、操作图标配色、禁用按钮可辨识、搜索区间距、分页位置、联邦门户样式污染规避、字典列审计机制十条实战沉淀。
- `check:scss` 新增反模式守门：包内出现 `.ag-header-row` 强制 height 直接报错（防二级表头破坏模式回流）。

### Fixed

- AG Grid 二级（分组）表头不渲染：移除 `.ag-header-row { height: 36px !important }` 强制行高，改由 `--ag-header-height` / 新增 `--ag-group-header-height` 变量驱动；并增加 `:has(.ag-header-row-column-group)` 两行兜底（真实存在分组行时强制两行各 36px），兼容共享 AG 适配层不透传 `groupHeaderHeight` 的存量场景。
- 表格滚动条改为"默认隐藏 → 悬停显示主题色（单档）"双轨实现：Chrome 121+ / Firefox 走标准 `scrollbar-color`，旧 Chromium 走 webkit 伪元素 + CSS 变量继承（`--wk-sb-thumb`），根治"容器:hover 直选伪元素在部分 Chromium 不触发重绘导致悬停不显示"的缺陷；横向条悬停展开 8px 主题色。
- 操作列编辑图标 hover 由绿改警示黄：与查看蓝/删除红拉开三色区分，绿留给成功/审核语义（业务定案）。

## [1.9.16] - 2026-08-11

### Fixed

- 修复 `action-dropdown-menu` 内直属 primary 按钮被全局品牌按钮锁重新刷成深色背景、同时继承菜单深色文字的问题；仅提升该复合菜单结构的特异性，普通主按钮与普通下拉菜单不受影响。
- 分页页码改为按 `.el-pager > li` 统一 12px/400 和等宽数字特性，不再依赖不同 Element/jh-ui 版本中不稳定的 `.number` 类，当前页继续仅以品牌色背景区分。

## [1.9.15] - 2026-08-10

### Added

- 新增 `normalizeColumnAlignment(s)` 运行时能力，把业务显式声明的 `align/headerAlign` 桥接为 BaseTable/AG Grid 可消费的 `cellStyle/headerClass`，并递归覆盖分组列。
- 新增行为与样式契约测试，覆盖无声明不接管、左右/居中对齐、分组列以及业务自定义样式优先级。

### Fixed

- 修复部分平台 AG Grid 适配器忽略列定义 `align/headerAlign`，导致业务明确要求居中或右对齐却仍按默认布局展示的问题。

### Changed

- `defineColumns()` 自动应用显式对齐桥接；未声明对齐的普通列保持原状，已有 `cellStyle/headerClass` 不覆盖，不引入全局居中规则。

## [1.9.14] - 2026-08-10

### Added

- 新增受管业务组件字体 Token 与 Edge/Chrome 双浏览器计算样式门禁，统一 Element Table、BaseTable、AG Grid 的中英文数字字体链，同时保持登录页、大屏、编辑器、图表、图标字体和显式豁免区边界。
- 复合结构清单按 common-core 真实 DOM 补全 `.com-inputNumber-content` 根类，并新增 jh-input-number 高度、对齐、controls、单描边视觉回归。

### Fixed

- 修复普通 InputNumber 高权重规则误命中 `jh-input-number`，造成复合数字框高度链、`textAlign` 与 controls 语义被压平的问题；复合根统一 26px 与五态外轮廓，内部 wrapper 不重复描边。
- 修复 AG Grid 普通单元格强制 flex 居中覆盖 BaseTable `align/headerAlign`，以及透明右边框遮掉焦点单元格一侧描边的问题；普通列重新遵循 AG Grid 原生对齐，仅复选框列保持精准居中。
- AG Grid 紧凑表头字号由半像素改为整数 13px，降低 Windows Edge 小字号抗锯齿差异。

## [1.9.13] - 2026-08-07

### Added

- 新增 `runtime/split-grid-resize` 分屏表格尺寸守护：只观察 `jh-drag-row` 的直接 pane，支持动态路由晚挂载，连续 Resize 按动画帧合并，并向 grid host 派发局部 `wl-ui:split-grid-resize` 事件。
- 复合结构清单新增 Element Plus input-group 新旧 DOM 与 common-core drag-row/AG Grid 契约，并补充 Node 行为测试和真实浏览器回归。

### Fixed

- 修复带 prefix/append 的输入框主体与右侧图标高度、圆角、边框不一致；组合根统一 26px、6px 和五态描边，左右图标统一 14px，纯图标附加段统一 32px，同时兼容旧版 input 直挂和新版 wrapper DOM。
- 修复上下分屏拖动后 AG Grid 宿主未沿 pane 收缩、上表只被外层 `overflow:hidden` 裁切且缺少内部纵向滚动的问题；只补齐已识别 AG Grid 的 flex 高度链，让 AG Grid 自身 ResizeObserver 完成内部布局。

### Changed

- 分屏守护不增加外层滚动条、不广播全局 `window.resize`、不访问 Vue 私有实例或猜测 gridApi；普通分屏、普通表格、非分屏 AG Grid、登录页和显式豁免区域不接管，卸载时清理包内结构标记。

## [1.9.12] - 2026-08-06

### Added

- 新增 `standards/component-structures.json` 复合控件结构契约，首批登记 common-core 多标签、人员/部门/树选择、多选、混合数字输入与 BaseToolbar 分裂按钮的边框所有者、高度策略、状态、内部无描边层和 Teleport 出口。
- 新增 R040 未知复合结构审查规则与真实 DOM fixtures；已登记结构正常通过，疑似新结构要求人工核对后再增加精准适配，不执行机械修复。
- 新增 Chromium 浏览器视觉回归及发布门禁，覆盖主题防反覆盖、按钮/圆角、textarea focus、数字输入单描边、复合输入自然增高、长文本提示、表格行状态和定制区域豁免。

### Changed

- `prepublishOnly` 升级为完整 `release:check`，npm 发布前必须同时通过代码、文档、构建、包内容及真实浏览器视觉回归；测试页和截图不进入 npm 包。

### Fixed

- 真实浏览器回归发现并修复复合多标签内部 editor 仍继承 Element Plus 默认 inset 的问题；仅在已登记的 `.com-input-multi-tag-wrap` 结构中清除子 wrapper 描边，普通输入与其他 picker 不受影响。

## [1.9.11] - 2026-08-06

### Fixed

- 精准识别 common-core 多标签输入的复合 wrapper，不再把 `.com-input-multi-tag-wrap.el-input.el-input__wrapper` 当成普通单行输入框强制固定高度；空值保持统一紧凑高度，标签换行时允许容器自然增长，避免外层边框消失或内容裁切。
- 复合输入严格保持“外层唯一描边、内层编辑器无描边”契约；默认、hover、focus、error、disabled 状态继续使用统一边框色、客户品牌色、危险色、禁用色与 6px 圆角，不产生双描边。

### Changed

- 新增复合多标签输入真实 DOM 分类测试，并同时锁定普通输入仍保持 26px 固定高度，防止专项修复放宽其他正常表单规则。

## [1.9.10] - 2026-08-01

### Added

- 新增 `@agile-team/wl-skills-ui/runtime/auto` 包级保护入口；Skin 项目一次引入即可获得主题锁和普通表格真实溢出 Tooltip 兜底，Native 项目的 `installCommonPreset()` 自动安装相同保护。
- 新增长文本 DOM 回归测试，覆盖真实溢出、未溢出、动态/虚拟行、Element 原生 Tooltip 优先以及操作列、Tag、定制区域等排除边界。

### Fixed

- 修复平台将 `.ag-cell` 与 `.ag-cell-value` 复用为 flex 节点时 `text-overflow: ellipsis` 只裁切、不绘制省略号的问题。
- 普通 Element Table、BaseTable 与 AG Grid 不再依赖页面是否调用 `defineColumns()` 才能获得长文本兜底；运行时仅在真实溢出时创建统一提示，不接管已有 Tooltip 或语义组件。

### Changed

- SCSS 发布门禁由引用路径检查升级为 full/skin 入口真实编译，避免合法性问题进入 npm 包。

## [1.9.9] - 2026-07-29

### Fixed

- 将 Element Table 与 AG Grid 的行 hover/selected 底色统一为品牌色 4%/7% 浅层，并保证 AG Grid 选中态优先于 hover，缓解可编辑控件下方色带过重且不覆盖校验态或业务语义单元格。

## [1.9.8] - 2026-07-29

### Fixed

- 统一紧凑业务表单 label、输入值、选择值、placeholder、textarea 与数字值为 12px，并继续豁免登录页和显式定制区域。
- 修复 textarea 聚焦后品牌色边框不清晰，以及数字输入框在不同 wrapper DOM、hover + focus 组合态下边框消失或双描边的问题。
- 补强原生 Element Table 与 AG Grid 长文本单行省略样式，继续由 R039 / `defineColumns()` 负责悬停完整提示与业务例外。
- 修复 BaseToolbar 分裂下拉按钮的箭头独立色块与菜单项内嵌按钮描边；规则仅命中 `action-button-wrap` 和 `action-dropdown-menu`，不影响普通按钮组与普通下拉菜单。

## [1.9.7] - 2026-07-28

### Added

- 新增 R038 创建类主按钮门禁与自动修复：新增/新建/添加/创建类操作统一使用客户主题 `primary` 填充按钮，自动移除误用的 `plain`。
- 新增 R039 表格长文本门禁与自动修复：原生 `el-table-column` 普通数据列统一补齐 `show-overflow-tooltip`。
- `defineColumns()` 为 BaseTable/AG Grid 普通文本列递归补齐超长省略与悬停完整提示；结构列、自定义渲染列、换行列及显式配置保持业务声明。

### Changed

- 表格样式仅对启用 overflow tooltip 的单元格补齐单行省略，避免影响 Tag、操作列和自定义内容。
- 列表页、按钮、Element Table、BaseTable 规范与模板同步声明主按钮和长文本交互契约。

## [1.9.6] - 2026-07-23

### Fixed

- 数值输入框统一由 Element Plus wrapper 绘制唯一边框，隐藏 common-core 残留步进按钮及浏览器原生数字步进器，保留 `type=number` 语义并修复焦点双边框、内容压盖和输入后边框消失。
- 固定 AG Grid 空数据插图与文案的紧凑尺寸并轻微下移视觉中心，避免不同表格高度导致空态大小不一或位置偏上。

## [1.9.5] - 2026-07-23

### Fixed

- 兼容 Element Plus 2.2 的数字输入框 DOM，修复输入后边框消失、焦点双边框、上下控制器压盖内容等问题。
- 重构 `jh-drag-row` 横向拖拽手柄为稳定的三点胶囊样式，并恢复上下分栏边界的精细层次。
- 修正 AG Grid 空数据覆盖层的定位上下文，使“没有可显示的行”在实际可视表格区域内水平、垂直居中。
- 完善 BaseToolbar 多按钮语义色、禁用态、图标间距以及 BaseQuery 展开/收起按钮视觉。

### Changed

- 列表页规范统一为“查询区 → 工具栏 → 列表标题 → 表格 → 分页器”，工具栏独占一行并左对齐。

## [1.9.4] - 2026-07-22

### Fixed

- 修复浏览器运行时通过成员链读取 Node 环境变量时被 Vite 4 开发转换误替换为非法语法的问题；改用安全的动态属性访问，兼容依赖预构建与直接 ESM 加载。
- 发布校验新增浏览器产物扫描，阻止 `process.env.NODE_ENV` 成员链再次进入 ESM 产物。

## [1.9.3] - 2026-07-22

### Fixed

- 登录页 `.lp-root` 与二次登录 `.session-login` 退出高权重表单、按钮和 jh-ui 组件化妆，恢复各登录页自身的高度、圆角、配色、焦点态与校验态，不再被业务页紧凑规则压制。
- 新增 `.wl-ui-skin-exempt` / `[data-wl-ui-skin="off"]` 通用定制页边界；边界内仅停用组件级强覆盖，边界外业务页面仍保持包内样式最高优先级，品牌主题锁继续全局生效。
- 将豁免贯穿 Element Plus 新旧输入 DOM、主按钮、textarea、必填标记及 jh-ui picker 适配，避免只恢复默认态、聚焦或报错后再次被覆盖。

## [1.9.2] - 2026-07-21

### Fixed

- 新增客户品牌主题锁：L0 的品牌色、功能色和圆角 token 使用 `!important`，运行时再监听 `html/body` 的主题变量改写，阻止平台 `/system/theme/list` 动态主题把包值改回旧亮色。
- `installCommonPreset()` / `installSecurityPreset()` 自动安装主题锁；同时公开 `installBrandThemeLock()`，纯 runtime 接入也可显式启用。
- 恢复按钮、输入框等基础控件的 `6px` 圆角，保留圆形、胶囊和按钮组的语义圆角，不再被 jh-ui 的 `2px` 基础值压平。
- 功能按钮锁定克制的成功 `#2BB268`、警告 `#EA9A13`、危险 `#BB2D3F`，并把彩色发光阴影收敛为轻量中性阴影，保持语义辨识但降低突兀感。

## [1.9.1] - 2026-07-20

### Fixed

- 按《烟台华新数智化信息化改造项目 UI 规范 v1》纠正主色色阶：常规 `#002A8F`、悬停 `#1A3F9A`、点击 `#002681`、禁用 `#B2BFDD`，不再把 PPT 元数据中的 `#2254F4` 当作业务按钮主色。
- 新增 Element Plus 主按钮四态强覆盖；BaseQuery/BaseToolbar 查询与主操作按钮的 hover 从旧 `primary-light-3` 改为客户规范 `primary-light-1`。
- 所有 vendor 半透明主色效果统一读取 `--el-color-primary-rgb`，清除 SCSS 中旧亮蓝 RGB 和 fallback，避免 token 已改但阴影、选中态仍有色差。
- 同步颜色规范、Design Token Skill、README 和发布产物；发布校验新增客户主色色阶与旧亮蓝残留检查。

## [1.9.0] - 2026-07-18

### Added

- 统一 CLI 正式暴露 `audit`、`drift`、`exempt`、`snapshot`，`audit --refresh-baseline` 可建立和收敛问题基线。
- 新增自动修复、快照路径边界、回退与 CLI 转发测试；新增包导出/运行时导入/规则目录与 fixer 一致性发布检查。
- 新增独立闭环与 kit 可选协同说明，明确 page-spec 只作为约定输入而非硬依赖。

### Fixed

- `./runtime` package export 改为真实 `es/index.js` 与类型声明，不再错误导出包根目录。
- runtime 构建入口改为完整 `runtime/index.ts`，`createPreset/installPreset` 与文档一致；删除指向未发布 TypeScript 源码的失效 presets 通配导出。
- `add-preset` 改为在消费项目的 `src/wl-ui/presets` 安全生成，不再尝试写入安装包目录；名称和输出路径均做边界校验。
- 快照创建失败改为失败关闭；修复写入中断自动恢复本轮文件；快照和回退拒绝路径穿越及符号链接越界。
- `autoFixable` 与实际 fixer 能力收口：脚本配色、图标、loading-mask 和圆角等语义修复不再误标为自动修复。
- `fix` 完成后自动复检，`--fail-on-error` 在仍有强制问题时正确返回非零状态。

### Changed

- 最低 Node.js 版本提升为 22；新增统一 `verify`、`release:check` 与 `prepublishOnly` 发布门禁。
- npm 发布白名单排除 scanner 测试夹具与维护脚本，只保留运行时 scanner/rules，避免发布包污染。

## [1.8.17] - 2026-07-15

### Changed

- **操作列状态辨识**：全局化妆层把可用图标默认色改为柔和主题蓝 `--el-color-primary-light-2`，hover 继续使用原有蓝/绿/红语义色；原生禁用态统一浅灰且不响应 hover，选中行不再自动改变按钮语义色。业务页面无需改造，升级样式包即可生效。

## [1.8.16] - 2026-07-01

### Fixed

- **label 冒号通杀（根治"就它带冒号"）**：此前冒号屏蔽仅覆盖 `.has-colon .el-form-item__label .com-text::after`（带 `.has-colon` 前缀）。但 jh-\* 组件（jh-select / jh-date / jh-picker / BaseForm 的自定义 component，如 CustomerPicker）的 `showColon` 默认 `true`，渲染的 label 走 `.com-text` 容器**但不一定带 `.has-colon` 类**，导致规则命不中、单点冒号残留。本次新增**不限 `.has-colon`** 的通杀规则，覆盖 `.el-form-item__label` 内所有 `.com-text` / `.text-line-2` 的 `:after`，特异性 `html body .el-form-item__label .com-text::after`（0,3,1）高于 jh-ui 注入，确定性咔嚓所有冒号伪元素

## [1.8.15] - 2026-07-01

### Added

- **jh-drag-row 上下分栏手柄覆盖**：新增 `styles/vendors/_jh-drag-row.scss`，把 `jh-drag-row`（来自 `@jhlc/common-core`，主从表/上下双表首选布局）的 `.slider_row` 手柄对齐到与 `_jh-drag-col.scss` 同源的极简细线 + grip dots 风格。此前 wl-skills-ui 只覆盖了 `jh-drag-col`（左右），缺少 `jh-drag-row`（上下），二者手柄风格不一致。覆盖以本包主色 `var(--el-color-primary)` / `rgba(34,84,244,...)`（`#2254f4`）为准，不读 common-core 组件 Props 默认值（硬编码 `#a7caec`/`#6f808d`），用 `html .drager_row > .slider_row { ... !important }` 确定性层叠压过。已注册进 `vendors/index.scss`，`jh-components/SKILL.md` 基线表与全局样式来源同步补充

### Changed

- **平台包职责澄清（文档）**：`@jhlc/jh-ui` 是**纯 SCSS 包（零组件）**，所有 `jh-*` / `Base*` / `C_*` 组件来自 `@jhlc/common-core`。本包作为化妆层，职责是**精准层叠覆盖**这两者的视觉，不改平台层源码：L0 token 用 `:root body`（特异性高于 jh-ui 编译产物的 `:root`）以本包 `#2254f4` 压过 jh-ui 的 `#4368ff`；L2 直接写目标属性（`background`/`border`）+ `!important` 绕过组件内部 `var()` 引用。**项目安装本包后，一切以本包为准**

## [1.8.14] - 2026-06-28

### Fixed

- **jh-picker 高度统一**：补齐 `.com-picker` / `.com-reference-picker` / `jh-picker` trigger 输入结构，picker 类单行控件与 input / select 保持 `26px` 高度一致。
- **label 冒号兜底**：扩展屏蔽 `@jhlc/jh-ui` 的 `.com-text:after` / `.text-line-2:after` 冒号注入，避免 picker label 残留 `:`。

## [1.8.13] - 2026-05-21

### Fixed

- **表单间距统一**：label 与右侧 Element Plus / jh-* 单行控件间距统一为 `--wk-form-label-control-gap: 16px`，避免 22px / 26px / 28px 混杂。
- **表单高度统一**：input / select / date-picker / cascader / input-number / autocomplete 等单行控件统一为 `--wk-form-control-height: 26px`，textarea 不强制固定高度。
- **label 冒号统一**：屏蔽 `@jhlc/jh-ui` 的 `.has-colon .com-text::after` 冒号注入，picker / select / input label 不再出现有的带冒号、有的不带冒号。

## [1.8.9] - 2026-05-17

### Improved

- **token 化圆角**：`_base-query-toolbar.scss` / `_jh-pagination.scss` / `_jh-ui.scss` / `_jh-tree.scss` 所有硬编码 `border-radius: 6px` / `4px` 全部替换为 `var(--el-border-radius-base)` / `var(--el-border-radius-small)` token 引用，未来调整圆角一处生效。
- **R028** 新增：检测业务 `<style>` 中硬编码 `border-radius` 数值，提示改用 token，避免升级后残留旧值。

## [1.8.8] - 2026-05-17

### Fixed

- **圆角统一**：`--el-border-radius-base` 从 4px 升级为 6px，所有 el-button / el-input / el-select / el-card 等页面级按钮与弹窗按钮圆角完全一致，修复页面场景与 dialog 不统一问题。

## [1.8.7] - 2026-05-17

### Added

- **loading 遮罩质感优化**：`_base-table.scss` 统一覆盖 BaseTable / AG Grid 的 `v-loading` 遮罩，灰色蒙层 → 毛玻璃半透明（`backdrop-filter: blur(1px)` + `rgba(255,255,255,0.45)`），数据切换近乎无感。
- **R025**：检测 defineColumns 列中 `options:[]` 纯文本退化，提示升级为 `renderTagSlot` / `renderDictClassifyTag` 彩色标签。
- **R026**：检测模板中原生 HTML 元素（`<table>/<input>/<select>/<button>/<textarea>`），提示替换为对应 Element Plus 组件以纳入统一风格体系。
- **R027**：检测业务代码硬编码 `.el-loading-mask` 背景色，提示删除（由 wl-skills-ui 统一覆盖）。
- fixture 测试覆盖 R025/R026/R027（22 条自动化测试）。

## [1.8.3] - 2026-05-13

### Added

- **scan --only / --skip**：支持规则级过滤，`--only R001,R016` 仅跑指定规则，`--skip R031-R037` 排除范围（支持连字符范围展开）。
- **exempt init 脚手架**：`wl-scan exempt init --target src` 智能扫描 src 下 big-screen/dashboard/chart 等个性化目录，自动生成 `.wl-exempt.json` 模板。

## [1.8.2] - 2026-05-13

### Fixed

- **搜索区字号不一致**：`_base-query-toolbar.scss` 统一 label / input / select / placeholder 为 **12px**，消除 13px→12px 混杂导致的视觉跳动。
- **必填星号重复 `* *`**：`_base-components.scss` 必填星号改为精确模式——默认只显示 `::before`，`asterisk-right` 仅显示 `::after`，避免 `display: inline-block !important` 同时作用于两个伪元素。`_jh-ui.scss` 同步精简为只声明颜色不控制 `display`。

### Added

- **scanner fixture 测试集**：`scanner/__tests__/` 覆盖 R001/R002/R006/R011/R016/R021 + drift 模块共 16 条自动化测试，`npm test` 一键跑。
- **SCSS 链路检查**：`scripts/check-scss.mjs` 递归验证 `styles/index.scss` 和 `presets/skin.scss` 的 `@forward/@use` 链路完整性。
- **scan --baseline 一步到位**：`wl-scan scan --target src --baseline .wl-baseline.json` 扫描后自动对比基线输出漂移报告，`--fail-on-error` 同时拦截新增违规。
- `package.json` 新增 `test` 和 `check:scss` 脚本。

## [1.8.1] - 2026-05-13

### Added

- 新增 **`scanner/drift.mjs`** 漂移检测模块：对比基线与当前扫描 JSON，输出 gained / fixed / regressed 结构化报告。
- 新增 CLI `wl-scan drift --baseline <f> --current <f>` 子命令，支持 `--output json` 和 `--fail-on-error` 门槛。
- 新增 MCP 工具 **`wl_ui_drift`**：AI 可直接传入两份扫描 JSON 拿漂移报告。

## [1.8.0] - 2026-05-12

### Added

- 新增 **`standards/rules.json`** R-rule 单一事实源：29 条规则按 `id / category / severity / appliesTo / autoFixable / scanner / skills` 结构化注册，所有 standards 文档、SKILL.md、scanner、MCP、未来 ESLint 插件均从此派生。
- 新增 **`standards/rules-loader.mjs`** 共享加载器：暴露 `loadRules / listRules / getRule / groupByCategory / buildRuleSummary`，scanner / MCP / check-docs / Vite 插件统一读取。
- 新增 MCP 工具 **`wl_ui_list_rules`**：按 `category / severity / autoFixable` 过滤返回规则摘要。
- 新增 MCP 工具 **`wl_ui_describe_rule`**：按 ID 返回单条 R-rule 完整定义（含 aliases 兼容旧 ID）。
- 新增 **`docs/governance-long-term.md`**：业务项目长效治理方案（基线 / 豁免 / 漂移看板 / 版本钉死 / 写作期 AI 守护五机制）。
- `scripts/check-docs.mjs` 扩展：校验 `scanner/rules/*.mjs` 中所有 `id` 必须在 `rules.json` 注册、SKILL.md 引用的 R-id 必须存在、`_registry.md` 引用的 skill 目录必须真实存在。

### Changed (Breaking-ish)

- **修复 R011 逻辑反转 bug**：之前 scanner 检测分页"不在 #footer 报错"，与 `standards/ui/05` "分页必须放内容区，不得放 #footer" 相互矛盾。v1.8.0 反转 scanner 检测语义，与 standards 对齐。
- **`scanner/rules/tag.mjs` R017/R018 重号为 R019/R020**：原 ID 与 `color.mjs` 的 R017/R018 冲突。`rules.json` 通过 `aliases: [R017_TAG_LEGACY/R018_TAG_LEGACY]` 兼容历史引用；scanner 输出 `rule` 字段改为新 ID。
- **`skills/_meta/_registry.md` 清理 12 条幽灵条目**：删除 9 个不存在的 `element/*` SKILL 引用（el-card/el-tabs/el-descriptions/el-tree/el-drawer/el-upload/el-steps/el-overlay/el-navigation/el-feedback），声明已统一归入 `element/component-family`；删除 2 个 `ops/*` 引用（route-intent / recommend-flow），声明为 MCP 工具而非独立 SKILL。
- **`skills/runtime/style-align/SKILL.md` 改为指针式引用**：不再复述 17 条 R-rule 内容，仅保留分类→编号→SKILL 映射表，规则细节统一查 `standards/rules.json` 或 `wl_ui_describe_rule`。
- `tsup.config.ts` `clean: true`：每次构建清空 `es/` 目录，避免 hash 残留。

### Notes

- R013（Upload 嵌入 operations[]）由文档约束晋升为 `rules.json` 正式条目（`severity: review`，无 scanner 实现）。
- 推荐业务项目跟进：跑一次 `npx wl-ui audit --target src --refresh-baseline` 建立基线，配合 `--baseline` 增量门槛使用（详见 `docs/governance-long-term.md`）。

## [1.7.1] - 2026-05-12

### Added

- 新增 Vite 插件 `@agile-team/wl-skills-ui/vite`：消费方在 `vite.config.ts` 加一行 `wlSkillsCheck()` 即可在每次 `dev/build` 启动期自动校验 vendor 版本配对，偏离推荐组合时彩色打印警告与一键修复片段（`enforce: 'warn' | 'error' | 'silent'`）。
- 新增 `npx wl-ui doctor --print-overrides` 子命令：检测到偏离时直接输出 pnpm/npm/yarn `overrides` JSON 片段，复制即可修复。
- `skills/_meta/_compat/loader.mjs` 抽出共享 compat 加载器，统一 `evaluateVendor` / `buildOverridesSnippet` 语义，scanner、MCP、Vite、CLI 单源共用。
- `vendors.json` 的 `compat` 升级为结构化 schema（`peers / gatingPeer / conflictsWith / domAssumptions`），同时保留旧平铺字段兜底；未来新增 vendor 配对无需改读取方代码。

### Changed

- scanner `I005` 改为遍历全部声明 `compat` 的 vendor，输出按 vendor 拆分的子检查项 `I005:<id>`，更易定位。
- MCP `wl_ui_detect_skin` 返回结构升级：`vendors[].verdict`、`fixSnippet`、`summary` 统一暴露，AI 一次拿全多 vendor 评估结果。
- `package.json` `files` 字段加入 `runtime/vite`，确保 Vite 插件随包发布。

## [1.7.0] - 2026-05-12

### Added

- 新增 `docs/compat-matrix.md`：项目集群推荐版本与 wl-skills-ui 的适配矩阵单一事实源（`element-plus@2.2.6-prod.3` + `@jhlc/jh-ui@3.1.0`）。
- `skills/_meta/_compat/vendors.json` 在 `jh.compat` 字段钉死推荐 EP/jh-ui 版本与 EP 2.2 vs 2.3 DOM 差异说明。
- scanner 接入完整性新增 `I005`：从 `vendors.json` 读取推荐版本，校验消费方 `package.json` 是否命中推荐组合。
- MCP 新增 `wl_ui_detect_skin` 工具：读取项目 `package.json` 返回 `verdict (match / mismatch / no-jh-ui)` 与推荐 SCSS 列表。

### Changed

- `legacy-skin-align` flow 增加 Phase 0.5 强约束：写样式前必须先识别 jh-ui ↔ EP 版本配对。
- `skills/vendors/jh-components/SKILL.md` 补全反例（`.el-input__wrapper.is-focus` 在 EP 2.2 永远命中不到等），并显式钉死推荐组合。
- `scripts/check-docs.mjs` 扩展：`docs/compat-matrix.md` 的 EP/jh-ui 版本必须与 `vendors.json` 一致。
- README 新增「项目-依赖适配矩阵速查」章节，引导消费方一键判断推荐组合是否命中。

## [1.6.14] - 2026-05-12

### Added

- 新增 `styles/vendors/_jh-ui.scss` 专项承接 `@jhlc/jh-ui` SCSS 皮肤包，覆盖 `.com-text` label 包裹、`.has-colon` 冒号注入、`.com-input` / `.com-textarea` 控件 wrapper 等 jh-ui 特有 DOM 模式。
- 新增 Element Plus 2.2.x（`.el-input__inner` 直挂结构、无 `.el-input__wrapper`）下输入、选择、日期控件的圆角 / focus / error 三态规则，jh-select 与 jh-date-picker focus 表现稳定。
- `skills/_meta/_compat/vendors.json` 在 jh vendor 下登记 `@jhlc/jh-ui` baseline 与 `_jh-ui.scss` 样式来源；`skills/vendors/jh-components/SKILL.md` 补齐识别表与全局样式来源。

## [1.6.13] - 2026-05-12

### Fixed

- 补强表单输入、选择、日期和文本域的 focus 品牌色边框兼容规则，确保普通 focus 态稳定生效。
- 补强 Element Plus 必填星号红色显示规则，兼容未显式配置 asterisk 方向的表单场景。

## [1.6.12] - 2026-05-12

### Fixed

- 修复表单 label 单行省略样式覆盖后，必填星号、错误 label、错误提示和错误边框红色态不明显的问题。

## [1.6.11] - 2026-05-11

### Changed

- 优化 BaseToolbar 下拉/分裂按钮组样式，统一高度、圆角、间距和下拉菜单 hover 可读性。
- 优化 AG Grid 操作列内 `jh-op-*` 操作按钮，取消 active 缩放并提升选中行可读性。
- 补齐输入控件 focus 品牌色边框、统一圆角、长表单 label 单行省略和弹窗图标居中尺寸规则。

## [1.6.10] - 2026-05-11

### Removed

- 移除所有 `wk-skills-ui` / `wk-ui` / `wk-scan` / `wks_ui_*` / `.wk-snapshot` / `wk-exempt` 旧命名（运行时、注释、文档、headers、MCP 工具名、scanner、styles），未来不再兼容旧前缀。
- `examples/wk-exempt.example.json` 重命名为 `examples/wl-exempt.example.json`。

### Added

- 新增 vendor 单一事实源 `skills/_meta/_compat/vendors.json`，承载 Base / jh / C / AG Grid / custom 的 id、priority、patterns、baseline、styles。`scanner/coverage.mjs` 启动时一次性 parse + 编译 RegExp，长生命周期复用，零运行时性能开销。
- 新增 CLI 子命令 `wl-ui add-vendor <tag> [--family <id>] [--dry-run]`，一键生成专项 SCSS、`@forward` 注册、vendors.json baseline 追加、scanner 规则草稿。
- `npm run docs:check` 扩展校验范围至 `.md/.mjs/.js/.ts/.scss/.css/.txt/.json/.vue`，新增 `wk-scan` / `.wk-snapshot` / `wk-exempt` / `wks_ui_` 禁忌词、vendor 优先级一致性、`jh-components` SKILL 全量通配语义校验。

### Changed

- MCP 工具前缀统一为 `wl_ui_*`（原 `wks_ui_*`），server name 同步为 `wl-skills-ui`。

## [1.6.9] - 2026-05-11

### Changed

- `vendors/jh-components` 明确采用 `<jh-*>` 全量通配治理，当前文档中的 `jh-table`、`jh-form`、`jh-tree`、`jh-pagination`、`jh-drag-col` 仅作为代表性基线，不是完整清单。
- README、架构边界和检测速查表补齐复杂 `jh-*` 封装升级为专项样式覆盖的准入条件，避免盲目穷举或局部补丁污染。
- 同步 `styles/vendors/index.scss` 中 Base、jh、C、AG Grid、custom wrappers 的 L2 优先级注释。

## [1.6.8] - 2026-05-11

### Changed

- 修正架构边界文档中 L1/L2 的表述：L1 负责 Element Plus 原生组件族，L2 Project Vendors 是当前项目集群的必需覆盖层。
- README 和架构文档明确 `Base*`、`jh-*`、`C_*`、AG Grid、自研封装和 custom wrappers 都必须按统一 tokens 与 Element Plus 基础视觉对齐，不应被理解为可选补丁。

## [1.6.7] - 2026-05-11

### Added

- 新增 `standards/architecture/01-layer-boundaries.md`，明确 tokens、Element Plus、vendors、layouts、runtime、scanner、skills 的职责边界和扩展规则。
- 新增 `npm run docs:check`，校验旧命名、旧命令、README 版本文案、CHANGELOG 版本记录和编辑器配置完整性。

### Changed

- CLI 编辑器安装配置改为读取 `skills/_meta/_compat/editors.json`，消除代码内第二份 `EDITOR_TARGETS` 路径映射。
- `editors.json` 补齐 `ext`、`singleFile`、`headerFile` 等安装行为字段，使 AI 编辑器配置成为单一事实源。

## [1.6.6] - 2026-05-11

### Changed

- README、主 `SKILL.md`、Flow、Standards、Templates 和多编辑器兼容文档同步到 `wl-ui` / `wl-skills-ui` 当前命名，移除旧版 `wk-ui` / `wk-skills-ui` 过期写法。
- README 和多编辑器兼容文档补齐 `wl-ui update --editor all --force`、manifest 多编辑器刷新策略和 v1.6.5 规则分发说明。

## [1.6.5] - 2026-05-11

### Added

- `wl-ui update --editor all --force`：支持一次性将同一套 `skills/**/*.md` 规则转换并覆盖写入全部支持的 AI 编辑器目录。
- manifest 新增 `editors` 数组记录，兼容旧版 `editor` 字符串字段，便于多编辑器项目持续更新。

### Changed

- `wl-ui update` 未指定 `--editor` 时，会优先刷新 manifest 中记录的编辑器和项目里已存在的编辑器规则目录，避免团队不同 AI 编辑器 rules 漂移。

## [1.6.4] - 2026-05-11

### Fixed

- 表单控件圆角统一使用 `--wk-form-control-radius`，覆盖 input、select、date、input-number、cascader、autocomplete、textarea、upload 等控件族。
- Element Plus 上传拖拽区和上传列表项补齐圆角 token 与 fallback，避免局部硬编码导致视觉不一致。
- `el-form`、`style-align` Skill 和 `standards/ui/03-form.md` 补齐表单圆角一致性规则，引导 AI 避免局部 patch。

## [1.6.3] - 2026-05-11

### Fixed

- Element Plus 表格空状态改为在对应表格区域内自适应居中，嵌套表格不再依赖固定高度猜效果。
- AG Grid 空状态提示文案改为更通用并支持 CSS 变量自定义。
- 查询区和工具栏按钮补齐 CSS 变量 fallback，避免 token 未加载时按钮颜色丢失。
- 禁用按钮增加独立样式约束，避免 hover/active 覆盖禁用态。

### Changed

- `el-table`、`base-table`、`style-align` 等 Skill 补充智能空状态修复规则，要求 AI 根据真实业务上下文判断空态文案与区域，而不是硬编码。

## [1.6.2] - 2026-05-09

### Changed

- vendors 层多组件样式精细化调整：`_base-components`、`_ag-grid`、`_portal`、`_jh-tree`、`_jh-pagination`、`_jh-drag-col`、`_c-components`、`_base-query-toolbar` 选择器精准度与覆盖范围优化。
- `design/tokens/base.css` / `dist/tokens.css` 同步更新设计令牌变量。
- `styles/presets/security.scss` 安全模块预设样式调整。

## [1.6.1] - 2026-05-09

### Changed

- 同步版本文案至 1.6.1，补齐 1.6.0 发布后文档一致性。

## [1.6.0] - 2026-05-07

### Added

- 扩展 Element Plus 高频组件族样式覆盖，补齐 card、tabs、descriptions、tree、drawer、upload、steps、overlay、navigation、feedback。
- 新增 scanner 组件覆盖和 B 端业务场景识别，输出 componentCoverage、recommendedSkills、recommendations、kitBridge。
- 新增 R031-R037 组件族治理规则，覆盖卡片、Tabs、详情、抽屉、上传、步骤和反馈状态。
- 新增 MCP 工具 wks_ui_route_intent 和 wks_ui_recommend_flow，支持 AI 意图路由和扫描结果推荐。

### Changed

- 同步 README、Skill registry、detection 和 component-family Skill，明确与 wl-skills-kit 的桥接边界。

## [1.5.1] - 2026-05-05

### Changed

- 更新 README、SKILL、Flow 与多编辑器兼容文档，补齐 manifest 生命周期、MCP、触发提示和规范插件说明
- 明确 `wl-skills-kit` 可选桥接边界：两包可组合提醒，但不互相强依赖
- 同步发布文档到 1.5.x 现状，避免旧版 CLI 和编辑器路径误导使用者

## [1.5.0] - 2026-05

### Added

- `wl-ui update/diff/clean/doctor/prompts`：补齐安装生命周期管理、安装清单、差异检查、清理与体检能力
- `wl-ui init/update`：安装 AI Skill 时同步写入 `.github/wl-skills-ui/TRIGGER_PROMPTS.md` 触发提示与 `.mcp.json` MCP 配置
- `mcp/server.js`：新增 `wl-skills-ui` MCP Server，提供 `wks_ui_check`、`wks_ui_scan`、`wks_ui_fix_dry_run`、`wks_ui_skill_prompt`
- 多编辑器适配扩展：新增 `claude-code`、`cline`、`agents-generic`、`qoder`
- 可选桥接提醒：检测/提示 `@agile-team/wl-skills-kit`，保持两包独立分工、不强耦合
- 规范插件提醒：建议业务项目执行 `npx @robot-admin/git-standards init` 接入代码质量与提交规范闭环

## [1.4.7] - 2026-05

### Added

- `scanner/rules/tag.mjs`：新增 **R017** — 脚本式 `columnsDef` 中编号/工号/证件号列缺少 `renderBadge` 检测（`checkScript` 钩子）
- `scanner/rules/tag.mjs`：新增 **R018** — 脚本式 `columnsDef` 中 `logicType:dict` 列缺少 `defaultSlot`/`renderDictClassifyTag` 检测（`checkScript` 钩子）
- `scanner/rules/tag.mjs`：R009 补全 `checkScript` — 状态/分类列（label 含"状态/级别/类型"）纯文本渲染检测扩展到脚本式列定义

### Fixed

- `SKILL.md`：规则定义章节补充 R017/R018 条目，含 diff 示例和判断原则
- `SKILL.md`：9.4 迁移规则补充中文 label 关键字表（编号/工号/证件号码 → `renderBadge`），解答"证件号码是否需要 badge"疑问
- 修复 scanner 盲区：此前扫描器仅检测 `<el-table-column>` 模板写法，对 `columnsDef()` 脚本式列定义完全失效，导致安全模块 66 处编号列、13 处状态列遗漏

## [1.4.6] - 2026-05

### Fixed

- `styles/vendors/_base-components.scss`：弹窗底部按钮选择器由 `.el-dialog .dialog-footer .el-button` 改为 `.el-dialog__footer .el-button`，确保 `jh-dialog` 直接在 `#footer` slot 放置按钮时也能命中；高度 30→28px，与内容密度匹配
- `styles/vendors/_base-components.scss`：`.el-message-box__btns .el-button` 高度同步降至 28px

### Added

- `templates/ui-optimization-report/TPL-UI-OPTIM-REPORT.md`：UI 风格优化记录报告结构化模板，含十二章节、R001~R016 规范对照、编号列 R016 防漏规则

## [1.4.5] - 2026-05

### Fixed

- `styles/element/_dialog.scss`：`.dialog-header-fullscreen-icon .svg-icon` font-size 调整为 12px，与 EP 关闭按钮视觉大小匹配

## [1.4.4] - 2026-05

### Fixed

- `styles/element/_dialog.scss`：移除 `.dialog-header-fullscreen-icon` 容器的 `width/height: 32px`，该约束会改变容器右边界导致 `right` 定位偏移

## [1.4.3] - 2026-05

### Added

- `styles/element/_dialog.scss`：新增 `.dialog-header-fullscreen-icon` 覆盖规则，适配 `@jhlc/common-core` `DialogComponent`（jh-dialog）的全屏按钮，`position: absolute; right: 44px; top: 16px`，颜色/hover 与 EP 关闭按钮统一

## [1.4.2] - 2026-05

### Added

- `reference/ag-cell-renders.ts`：`renderOps` 对 `show=false` 的图标按钮改为 `visibility: hidden` 占位，确保同列不同行按钮上下对齐
- `styles/element/_dialog.scss`：新增 EP 原生 fullscreen prop 场景的 headerbtn 间距收紧规则（`.el-dialog__headerbtn { right:8px }`）

## [1.4.1] - 2026-05

### Added

- `styles/presets/security.scss`：security 品牌色预设（`#002a8f` 主色完整梯度 + danger 色系），基于 skin 模式（L0+L1+L2）
- `runtime/presets/security.ts`：`installSecurityPreset()`，安防业务状态字典映射（违章/车辆/出入/布控/报警）
- `examples/migration-operations-to-renderOps.md`：`operations: []` → `defaultSlot + renderOps` 完整迁移示例

## [1.4.0] - 2025-05

### Added

- **快照回退机制**：`wl-scan fix` 自动在修复前创建快照，支持 `wl-scan snapshot rollback` 一键回退
- **快照管理命令**：`snapshot list / rollback / diff / clean`，完整的快照生命周期管理
- **豁免配置系统**：`.wk-exempt.json` 配置文件，支持路径级和规则级豁免（大屏/地图/流程等）
- **结构化报告增强**：报告新增豁免统计、规范覆盖率、回退命令提示
- **security 预设**：`runtime/presets/security.ts` 安防业务状态映射（违章/车辆/出入/布控/报警）
- **security SCSS 预设**：`styles/presets/security.scss` 安防品牌色覆盖（#002a8f 主色系）
- **operations 迁移指南**：`examples/migration-operations-to-renderOps.md` 完整迁移示例
- **豁免配置模板**：`examples/wk-exempt.example.json` 默认豁免路径清单
- CLI 新增参数：`--exempt`（豁免配置）、`--no-snapshot`（跳过快照）、`--id`（指定快照）、`--keep`（清理保留数）

### Changed

- `fix.mjs` 重构为两遍扫描：先收集再写入，支持原子化快照
- `report.mjs` 摘要新增实际检查文件数、豁免文件数、规范覆盖率百分比
- `index.mjs` 支持 `snapshot` 子命令
- `wl-ui.js` CLI help 更新为 v1.4，补充 snapshot 和 exempt 用法
- `package.json` exports 新增 `./runtime/presets/security` 和 `./runtime/presets/*`

## [1.3.1] - 2025-05

### Fixed

- 全局包名/路径统一为 `@agile-team/wl-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
- `installSafePreset` / `safe-preset` 全部修正为 `installCommonPreset` / `common-preset`
- `renderDangerText` 硬编码 `#f56c6c` → `var(--el-color-danger)`
- `RATING_LEVEL_COLORS` 硬编码颜色 → `var(--wk-rating-lv*, fallback)` 可主题化
- `renderRatingLevel` fallback 硬编码 → `var(--wk-rating-fallback-*, fallback)`
- `reference/define-columns.ts` selection 列宽度 42→55 与标准对齐
- `_registry.md` 版本号 v0.3→v1.3
- README 路线图版本号修正（v1.4/v1.5/v1.6/v2.0）
- License 统一为 UNLICENSED（内部专用）
- `report.mjs` RULE_NAME 补齐 R009/R010/R012
- `scanner/fix.mjs` TOKEN_MAP 重复定义 → 从 `_shared.mjs` 统一导入
- `03-scss-structure.md` tokens 引入方式修正（`@import` → `<link>` 加载）
- `_portal.scss` 注释包名修正
- TS 类型报错修复：添加 `vue`/`element-plus`/`@element-plus/icons-vue` devDeps
- 创建 `types/jhlc.d.ts` 为 `@jhlc/*` 内部包提供类型 stub
- 创建 `tsconfig.check.json` 供 IDE 全项目类型检查
- `reference/define-columns.ts` 17 处 `row` 隐式 any 类型修复
- `reference/ag-cell-renders.ts` ElTag type 属性类型断言修复

### Added

- Scanner 规则 R009（状态字段纯文本渲染）、R010（分类 Tag 缺 effect="plain"）、R012（弹窗内 el-table 缺 empty-text）
- SCSS 变量映射层 `$wk-*`（`styles/tokens/index.scss`）
- 构建脚本 `sync:tokens` 自动同步 `dist/tokens.css`
- `sideEffects` 字段优化 tree-shaking
- `package.json` exports 显式声明 `./runtime/common-preset`；`./runtime` 重定向到主入口
- `files` 包含 `reference/` 和 `examples/`
- CHANGELOG.md

### Changed

- `examples/quickstart.md` 删除（与 README 重复）
- SKILL.md 第八节精简（改为引用 README）
- README.md 规范表补充 R009/R010/R012，目录结构更新

## [1.3.0] - 2025-04

### Added

- 五层架构（L0 tokens → L1 element → L2 vendors → L3 layouts → L4 runtime）
- 双运行模式：Native（新项目完整接入）/ Skin（老项目化妆对齐）
- 4 级 SCSS 预设：`full` / `skin` / `element-only` / `tokens-only`
- Runtime API：`defineColumns` / `renderOps` / `renderTagNode` / `renderClassifyTag` / `renderBadge` / `renderCountBadge` / `renderRatingLevel` / `renderDangerText`
- 通用业务预设 `installCommonPreset()`：15+ 字段自动映射
- 动态字典解析器 `setDictResolver()`
- CLI 工具：`wl-ui init/scan/check/fix/all/add-preset`
- Scanner 规则：R001–R018（table/form/button/tag/dialog/color）
- AI Skills 系统：4 flows + 12 单点 skill
- 多编辑器适配：GitHub Copilot / Cursor / Windsurf / Kiro / Trae
- `sideEffects` 字段优化 tree-shaking
- `package.json` exports 显式声明 `./runtime/common-preset`；`./runtime` 重定向到主入口
- `files` 包含 `reference/` 和 `examples/`
- SCSS 变量映射层 `$wk-*`（`styles/tokens/index.scss`）
- 构建脚本 `sync:tokens` 自动同步 `dist/tokens.css`
- Scanner 规则 R009（状态字段纯文本渲染）、R010（分类 Tag 缺 effect="plain"）、R012（弹窗内 el-table 缺 empty-text）

### Fixed

- 全局包名/路径统一为 `@agile-team/wl-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
- `installSafePreset` / `safe-preset` 全部修正为 `installCommonPreset` / `common-preset`
- `renderDangerText` 硬编码 `#f56c6c` → `var(--el-color-danger)`
- `RATING_LEVEL_COLORS` 硬编码颜色 → `var(--wk-rating-lv*, fallback)` 可主题化
- `renderRatingLevel` fallback 硬编码 → `var(--wk-rating-fallback-*, fallback)`
- `reference/define-columns.ts` selection 列宽度 42→55 与标准对齐
- `_registry.md` 版本号 v0.3→v1.3
- README 路线图版本号修正（v1.4/v1.5/v1.6/v2.0）
- License 统一为 UNLICENSED（内部专用）
- `report.mjs` RULE_NAME 补齐 R009/R010/R012
- `scanner/fix.mjs` TOKEN_MAP 重复定义 → 从 `_shared.mjs` 统一导入
- `03-scss-structure.md` tokens 引入方式修正（`@import` → `<link>` 加载）
- `_portal.scss` 注释包名修正
