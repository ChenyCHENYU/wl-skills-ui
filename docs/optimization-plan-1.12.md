# v1.12 精确治理与长期演进方案

## 目标

本轮把 wl-skills-ui 从“样式 + Skill 集合”收敛为可验证的治理平台：机器完成唯一答案，AI 只处理业务判断；Profile 显式组合 adapter，避免 AG Grid 等当前实现变成永久架构依赖；默认输出总览，按需分页获取明细。

## 分类模型

| 类别 | 事实源/入口 | 门禁 | 扩展方式 |
| --- | --- | --- | --- |
| 规则语义 | `standards/rules.json` | metadata/implementation/fixer 集合一致 | 新增 R-rule、实现、fixture、Skill 引用 |
| 能力组合 | `standards/profiles.json` | Profile ID、样式和 runtime 入口存在 | 增加 adapter 或 Profile，不改通用 fixer |
| 样式交付 | `styles/presets/*` | 全入口编译；非 AG 产物零 `.ag-*` | vendor partial 通过条件能力组合 |
| Runtime | `runtime/profiles.ts` | 非 AG Profile 关闭 AG observers | 每个 adapter 提供显式 guard 选项 |
| 扫描协议 | `scanner/engine.mjs`、`report.mjs` | CLI/MCP 共用引擎和 schema 测试 | schema 版本化，保留兼容格式 |
| 安全修复 | `scanner/fix.mjs` | only/skip/profile、计划哈希、快照、复检 | 只接纳唯一确定结果的 transformer |
| AI 知识 | 根 `SKILL.md` + 局部 Skill | 路径存在、根路由长度、引用有效 | 渐进披露，不再拼接整套 Skill |
| 项目安装 | manifest + 托管区块 | init/update/clean 保留用户内容 | 管理自己的 block/JSON key，不管理整文件 |
| 发布 | lint/typecheck/coverage/SCSS/docs/build/package/browser | 任一失败禁止发布 | 版本、tag、npm 包三方一致 |

## 已落地改进

### 规则准确性

- 39 条规则元数据和 39 个 scanner 实现一一对应；运行期 category、severity、layer、vendor 统一由元数据覆盖。
- 14 条 `autoFixable` 与 fixer 实现集合完全一致。
- R013 从 CLI 特判变为正式规则实现，并将定义纠正为旧 `operations[]` 迁移。
- R005 保留动态/未知按钮语义判断；R043 仅处理静态已知文案到 icon 的确定映射，避免“元数据说不可修、fixer 却偷偷修改”。
- 规则和 coverage 推荐的每个 Skill 路径都由文档门禁验证存在。

### AG Grid 解耦

- `native-element`：Element + layout，不包含 legacy vendor/AG 样式；关闭 split/AG empty-state observers。
- `legacy-jh-element`：Base/jh/C/custom，无 AG；R003/R022 可用，R021 禁用。
- `legacy-jh-ag`：显式启用 AG adapter；R021、AG 样式与 AG observers 同时开启。
- 压缩 CSS 实测：native 52,618 bytes，legacy 无 AG 127,375 bytes，legacy + AG 145,904 bytes。门禁还会检查两个非 AG Profile 中 `.ag-*` 选择器数量必须为 0。

### 性能与进程模型

- CLI 和 MCP 复用 `scanner/engine.mjs`；MCP 扫描不再为每个调用创建 Node 子进程。
- 文件和规则顺序稳定，保证分页、计划哈希和 CI 结果可复现。
- Runtime Profile 在非 AG 项目不注册分屏与 AG 空态 observers；Observer Hub 仍负责同类监听复用和完整卸载。
- `installCommonPreset()` 默认使用 `native-element`；旧 `runtime/auto` 保留为 full legacy 兼容入口。

### Token 与上下文预算

- MCP 默认 `summary`：只有计数、规则分布、推荐 Skill/动作，不含逐条问题描述。
- `compact-v2`：同一规则的 severity/category/suggestion 只进一次 `ruleCatalog`，问题使用短 tuple，并提供 `limit/cursor/nextCursor`。
- changed-only 解析失败默认报错；只有显式 `--changed-fallback full` 才扩大为全量。
- 单文件编辑器从全量 Skill 拼接改为托管路由块；根 Skill 只做决策路由，AI 按命中场景打开一个局部 Skill。
- 推荐调用预算：summary 一次；compact-v2 每页 50 条；规则解释用 `rules describe <id>`；源码只读命中文件和行附近。

### Fixer 安全闭环

```text
profile + only/skip
        ↓
确定性 transformer 生成计划
        ↓
dry-run 返回 file/rule/change + planHash
        ↓
应用前重新计算并核对 planHash
        ↓
快照 → 原子写入/失败回滚 → 同范围复检
```

R021 只有 `legacy-jh-ag` 可进入计划。预览后文件、规则、Profile 或内容任一变化都会改变哈希并拒绝应用。

### 安装与清理安全

- `AGENTS.md / CLAUDE.md / .clinerules` 只更新 `wl-skills-ui:begin/end` 托管区块。
- `clean` 只移除托管区块；区块外项目规则保留。
- `.mcp.json` 只增加/移除 `mcpServers.wl-skills-ui`，其他 server 保留。
- manifest 对托管 block/JSON key 单独计算 hash，项目在区块外的正常修改不会制造伪 diff。

## AG Grid 未来替换策略

如果未来改用 TanStack Table、VXE Table 或内部表格，不删除通用 table 规则，也不把新实现写进 BaseTable fixer。按下面顺序迁移：

1. 在 vendor registry 新增 adapter ID、识别 pattern、Skill 和兼容证据。
2. 增加对应样式 partial 与 runtime guard；通用 table 契约继续留在 L1/runtime core。
3. 新增 Profile，例如 `legacy-jh-vxe`；只在该 Profile 启用实现专属规则。
4. 把 R021 标记为仅旧 AG Profile 使用；新表格用新规则 ID 表达专属契约。
5. 运行双 Profile 扫描和视觉契约，迁移完成后再弃用旧 Profile。

这样 `BaseTable` 是业务封装能力，AG Grid 只是其中一个 adapter，不再等同。

## 后续演进门槛

以下项目暂不应无条件自动化：操作列结构重写、动态 icon、状态字典和业务色板、未知复合控件、跨表格技术迁移。只有在获得结构化输入、唯一映射和反例测试后，才能从 AI/人工区转入 fixer。

建议后续按数据而不是感觉优化：记录 scan 总耗时、解析器命中率、summary/compact-v2 字节数、每规则误报/豁免率、fix preview 到 apply 的哈希失效率、Profile CSS bytes、observer 数量和 CI 各阶段耗时。连续两个版本有稳定样本后再设更严格预算。
