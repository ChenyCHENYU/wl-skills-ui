# 工程规范 02 — 命名规范

## 文件命名

| 类型       | 规则                                     | 示例                 |
| ---------- | ---------------------------------------- | -------------------- |
| Vue 组件   | PascalCase                               | `RiskList.vue`       |
| 工具/hooks | camelCase                                | `usePageHook.ts`     |
| 常量/枚举  | camelCase（文件名）+ UPPER_SNAKE（变量） | `statusMap.ts`       |
| 样式       | kebab-case                               | `risk-list.scss`     |
| 模板       | TPL-前缀 + UPPER_KEBAB                   | `TPL-FORM-DIALOG.md` |

## 变量/函数命名

```typescript
// ✅ 状态映射：UPPER_SNAKE + _MAP 后缀
const ENABLE_STATUS_MAP = { ... }

// ✅ Render 函数：renderXxx
const renderEnableStatus = (v) => renderTagNode(v, ENABLE_STATUS_MAP);

// ✅ API 函数：动词 + 名词
async function getRiskList(params: QueryParams) {}
async function updateRiskStatus(id: string, status: string) {}

// ✅ hooks：use 前缀
const page = usePageHook({ apiFn: getRiskList, params: () => searchForm });

// ❌ 禁止
const status_map = {}          // 应用 camelCase 或 UPPER_SNAKE
function GetRiskList() {}      // 大写开头的非组件函数
const renderFlag = (v) => ...  // 不应叫 flag，应描述具体字段
```

## 组件 prop 命名

```typescript
// ✅ camelCase（JS 侧），HTML 中用 kebab-case
defineProps<{ labelWidth: string; isReadonly: boolean }>();

// template 中
<MyComp :label-width="150" :is-readonly="true" />
```

## 接口/类型命名

```typescript
// ✅ 接口：I 前缀 可选，但 Type 后缀推荐
interface RiskItem { ... }
type SearchParams = { name: string; status: string };

// ✅ 响应包装
type PageResult<T> = { records: T[]; total: number; current: number; size: number };
```
