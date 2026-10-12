# UI 扫描结果的按需读取

2026-10-12 源码修订，尚未发布或安装至业务项目。MCP `wl_ui_scan` 首次调用扫描一次，默认 summary；需要明细时使用同进程原结果游标，避免为翻页重新解析页面、加载规则或写检查回执。扫描不调用模型 API，AI 宿主上下文用量另计。

```json
{"target":"src","profile":"native-element","output":"summary","maxBytes":12000}
```

取返回的 `response.nextResultCursor`（summary 指向明细第一页），同一个 `wl_ui_scan` 工具续取：

```json
{"resultCursor":"<nextResultCursor>","output":"compact-v2","limit":20,"maxBytes":12000}
```

续取仅允许 project/resultCursor/output/limit/maxBytes/runId，不重新传扫描条件；project 仍须在 MCP 启动项目边界内，runId 若提供必须匹配原扫描。读取 summary 或 compact-v2，保留完整问题计数、原执行状态及时间。非法、越界、项目不匹配、过期或进程重启后的游标明确失败，不自动重跑。

MCP limit 默认 20、范围 1～500；maxBytes 默认 12,000、范围 4,096～65,536。预算按 UTF-8 序列化处理结果计算（包含 text 字符串转义），不含外层 JSON-RPC/MCP 包装和宿主元信息，不是模型 token 硬上限。长描述/建议最多 300 个 Unicode 码点并显式裁剪；定位和全量计数保留。必要元信息或单项超过预算时明确失败。

快照只存在进程内存：固定五分钟有效期、最多 16 份、单份 8 MiB、总共 32 MiB，按存入顺序淘汰。超出单项预算不缓存，nextResultCursor=null；尚有未读问题应使用完整 CLI 工件。所有阅读输出 `displayOnly:true`，带 snapshotAt/expiresAt；源码改动后仍读取原扫描快照，不证明当前源码已复验。修复后须不带游标重新扫描。

旧数字 cursor 保留原先重新扫描的语义；CLI 的 cursor/limit 也是一次独立命令，不跨进程缓存。新读取预算仅适用于 MCP summary/compact-v2；显式 json/compact/markdown 及 CLI 完整工件不使用该上限。接入 Gate 使用完整 CLI JSON，不能把摘要、裁剪或未读完的分页视图传给原生报告适配器；Gate 会拒绝这些阅读输入。
