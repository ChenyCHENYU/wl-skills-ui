# UI Contract：领域页面的脱敏语义 JSON

`wl-ui-contract.v1` 用于沉淀成熟页面的视觉结构和组件能力，让 CLI、MCP 与 AI 可以先检索小型 JSON，再决定是否读取源码。它不是代码压缩格式，也不用于还原完整业务页面。

## 设计目标

1. 确定性提取：SFC parser、组件模式和 R-rule 负责结构识别，AI 不需要重新阅读整页后自由总结。
2. 默认脱敏：不保存源码、真实接口、业务字段、字段值和按钮原始文案。
3. 可比较：语义 fingerprint 排除 id、source file/hash 等来源元数据。
4. 可分层：按 domain、scenario、mode 和 visibility 管理项目、领域与共享模板。
5. 可验证：schema、禁止字段、visibility 和 fingerprint 在落库前统一检查。

## 数据模型

| 字段 | 含义 |
| --- | --- |
| `schema` | 固定 `wl-ui-contract.v1` |
| `id` | 契约标识，不参与 fingerprint |
| `visibility` | 默认 `project-private` |
| `domain/scenario/mode` | 领域、页面场景与 native/skin 模式 |
| `source` | 仅 basename、sha256 与实际 parser，不含绝对路径和正文 |
| `layout` | 页面骨架与 query/toolbar/table/pagination 等区域 |
| `components` | 通用 family、已知 implementation、数量与能力 |
| `actions` | create/search/edit 等语义、位置、small/icon 状态 |
| `rules` | 场景要求与页面实际观察到的 R-rule |
| `tokens` | 使用到的公开 `--el-*` / `--wk-*` token 名 |
| `constraints` | 中心轴、small icon、Picker 几何隔离等通用约束 |
| `fingerprint` | 排除来源元数据后的稳定语义 sha256 |

权威 JSON Schema：[`../standards/ui-contract.schema.json`](../standards/ui-contract.schema.json)。

## 提取、校验与匹配

```bash
# 预览；不写文件
wl-ui contract extract --path src/views/produce/order/list.vue \
  --domain produce --scenario query-table --mode native --parser auto

# 写入必须显式确认
wl-ui contract extract --path src/views/produce/order/list.vue \
  --domain produce --scenario query-table \
  --output-file .wl-ui/contracts/produce/order-list.json --confirm

wl-ui contract validate --input .wl-ui/contracts/produce/order-list.json
wl-ui contract match --input .wl-ui/contracts/produce/order-list.json \
  --library .wl-ui/contracts --limit 5
```

MCP 对应：

- `wl_ui_contract_extract`；
- `wl_ui_contract_validate`；
- `wl_ui_contract_match`。

三个工具均只读。MCP extract 只返回 JSON，不提供 outputFile；path 和 library 必须位于声明的项目根目录内。

## 匹配模型

候选匹配只返回摘要，不把模板库全文塞进模型上下文。当前权重：

| 维度 | 权重 |
| --- | ---: |
| domain 相同 | 25% |
| scenario 相同 | 25% |
| layout kind 相同 | 15% |
| component family Jaccard | 15% |
| mode 相同 | 10% |
| layout regions Jaccard | 10% |

fingerprint 完全相同时直接记为 `1.0`。权重是可解释的确定性排序，不声称等价于业务相似度；最终采用哪个模板仍应由使用者或领域规则决定。

## 脱敏边界

校验器会阻止以下 key 进入契约：`code`、`template`、`sourceCode`、`api`、`url`、`endpoint`、`request`、`response`、`field(s)`、`text`、`label`。

此外还应遵守：

- 不把 source hash 当成共享标识；它只用于判断本地来源是否变化。
- 不通过 constraints、id 或自定义字符串绕过禁止字段保存客户数据。
- `project-private` 提升为 `domain-private` 前做一次领域脱敏审计。
- 进入公共包前设置 `shared-reviewed`，并由非原作者复核 JSON。
- 契约库不应包含 `.env`、token、cookie、数据库 ID 或后端响应样本。

## 推荐目录

```text
.wl-ui/contracts/
├── produce/
│   ├── query-table/
│   └── dialog-form/
├── sales/
│   └── query-table/
└── shared-reviewed/
```

建议每个领域场景保留少量经过验证的代表模板，不要为每个页面保存一个近似副本。相同 fingerprint 的候选应合并，只保留更成熟、证据更完整的来源。

## 与 wl-skills-kit Blueprint 的关系

UI Contract 只关注视觉布局、组件能力和 UI 规则；Kit Page Blueprint 还可以描述查询、列、接口操作、字典和页面交付结构。推荐先用 UI Contract 找到视觉模式，再在确需生成或重构业务页时读取对应 Blueprint，两者不互相复制源码。
