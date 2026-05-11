# 工程规范 01 — Import 顺序

## 规则

按以下顺序组织 import，组间空一行：

```
1. Node.js 内置模块（node:fs 等）
2. 第三方依赖（vue、element-plus、lodash 等）
3. 内部别名路径（@/、@agile-team/）
4. 相对路径（../、./）
5. 类型导入（import type ...）
```

## 示例

```typescript
// ✅ 正确
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";

import { usePageHook } from "@/hooks/page";
import type { PageResult } from "@/types";

import { renderOps, defineColumns } from "@agile-team/wl-skills-ui/runtime";

import MyModal from "./MyModal.vue";
import type { MyItem } from "./types";
```

```typescript
// ❌ 错误：类型与值混用，无分组
import MyModal from "./MyModal.vue";
import { ref } from "vue";
import type { MyItem } from "./types";
import { usePageHook } from "@/hooks/page";
```

## ESLint 配置参考

```json
"import/order": ["error", {
  "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
  "newlines-between": "always"
}]
```
