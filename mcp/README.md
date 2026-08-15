# mcp 目录状态说明

| 文件 | 状态 | 说明 |
|---|---|---|
| `registry.js` / `projectTools.js` | ✅ 维护中 | 2026-08 起随各版本持续更新 |
| `server.js` | ⚠️ 冻结 | 2026-05 之后的早期实验实现，**不再维护**；新集成请走 `registry.js` 注册的工具，不要基于 `server.js` 扩展 |

> 该目录通过 package.json `files` 随包发布。若未来统一 MCP 接入方式，`server.js` 应在下个
> major 版本移除（breaking change 需在 CHANGELOG 显著标注）。
