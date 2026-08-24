# MCP 接入

`server.js` 是维护中的 stdio MCP 入口，npm 安装后直接启动：

```bash
wl-ui-mcp
```

```json
{
  "mcpServers": {
    "wl-skills-ui": {
      "command": "wl-ui-mcp",
      "env": { "WL_PROJECT_ROOT": "/absolute/path/to/project" }
    }
  }
}
```

## 13 个 Tool

| Tool | 作用 |
| --- | --- |
| `wl_ui_check` | 接入完整性检查 |
| `wl_ui_scan` | UI 规则扫描，默认 compact，支持 changed-only 与 auto/fast/sfc parser |
| `wl_ui_fix_dry_run` | 只预览确定性修复 |
| `wl_ui_skill_prompt` | 输出 Skill 触发提示 |
| `wl_ui_route_intent` | 自然语言意图路由 |
| `wl_ui_detect_skin` | vendor 与 Element Plus 版本配对 |
| `wl_ui_list_rules` | 规则摘要查询 |
| `wl_ui_describe_rule` | 单条规则详情 |
| `wl_ui_drift` | 基线漂移比较 |
| `wl_ui_recommend_flow` | 根据扫描结果推荐后续流程 |
| `wl_ui_contract_extract` | Vue 页面转脱敏 UI 语义 JSON |
| `wl_ui_contract_validate` | 校验 schema、fingerprint 与脱敏边界 |
| `wl_ui_contract_match` | 匹配项目内领域契约库，只返回摘要与分数 |

`wl_ui_scan` 默认返回 `wl-ui-scan.compact.v1`：问题按文件分组，公共字段只出现一次。需要完整上下文时传 `output: "json"`，面向人工阅读时传 `output: "markdown"`。

MCP 只编排确定性 scanner、dry-run、规则事实源和契约工具，不让模型重新阅读全项目后猜测 UI 问题。三个 contract 工具均只读，path/library 必须位于项目根目录内；契约不会返回源码、真实接口、业务字段值或按钮原始文案。

真正修改业务文件仍通过 CLI `wl-ui fix`，修复前先运行 `wl_ui_fix_dry_run`，并由使用者确认范围。CLI 实际修复默认创建快照并自动复检。
