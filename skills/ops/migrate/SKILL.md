---
description: |
  渐进迁移 Skill — 指导老项目从 Skin 化妆模式渐进迁移到 Native 原生模式（按模块、按 vendor、按层次）。
  明确迁移触发条件、安全顺序和回退机制。
applyTo: "**"
---

# ops/migrate SKILL

## 一、迁移目标

从 **Skin 模式**（只有 L0/L1/L2 化妆）升级到 **Native 模式**（全五层），同时保证：
- 迁移期间业务功能不中断
- 按模块/按 vendor 逐步替换，不做大爆炸式重写
- 每步可回退

---

## 二、迁移触发条件

以下任意条件满足时，建议启动对应模块的迁移：

| 条件 | 建议迁移内容 |
|---|---|
| 拿到封装组件源码（如 BaseTable）| 把 L2 化妆 → L4 runtime 调用 |
| 新增模块（CRUD 列表页）| 直接用 Native 骨架（list-page + defineColumns）|
| 发现大量 R009 状态字段纯文本 | 迁移到 renderTagNode / COLUMN_AUTO_MAP |
| 性能优化需要（减少全局 CSS override）| L2 vendor 选择器精细化 |
| 业务 preset 需要扩展 | 用 createPreset() / installPreset() 替代手写 map |

---

## 三、迁移安全顺序

```
Step 1 — 接入 design/tokens/base.css        (可立即，无风险)
Step 2 — 接入 styles/presets/skin            (可立即，只加不改)
Step 3 — 接入 styles/presets/full            (替换 skin，确认布局无冲突)
Step 4 — 接入 installCommonPreset()          (仅影响新页面，旧页面不动)
Step 5 — 新模块用 defineColumns + renderOps  (只影响新写代码)
Step 6 — 旧模块逐批迁移 columnsDef → defineColumns
Step 7 — 旧 vendor 化妆层（_base-table.scss 等）按需保留或删除
```

---

## 四、AI 辅助迁移流程

在 AI 编辑器中触发：

```
用 wl-ui 的 ops/migrate skill 帮我迁移 src/pages/safety/ 目录
```

**AI 执行步骤：**

1. 扫描目标目录：`npx wl-ui scan --target src/pages/safety --output json`
2. 识别迁移优先级：
   - R013（columnsDef 旧格式）→ 优先迁移到 `defineColumns`
   - R004/R005（按钮规则）→ 用 `renderOps` 替换
   - R009（状态字段）→ 注册到 COLUMN_AUTO_MAP
3. 逐文件迁移，**每文件迁移后立即验证**（重跑 scan 确认问题归零）
4. 汇报迁移结果

---

## 五、具体迁移操作

### 5.1 columnsDef → defineColumns

```typescript
// ❌ 旧写法
columnsDef() {
  return [
    { label: '名称', name: 'name' },
    { label: '状态', name: 'enableStatus', logicType: BusLogicDataType.dict },
    { label: '操作', operations: [
      { name: 'edit', label: '编辑', onClick: (row) => modal.edit(row.id) },
    ]},
  ];
}

// ✅ 新写法
import { defineColumns, renderOps } from '@agile-team/wl-skills-ui/runtime';

columnsDef() {
  return defineColumns([
    { label: '名称', name: 'name' },
    { label: '状态', name: 'enableStatus' },           // 自动 Tag（已注册）
    { label: '操作', width: 100, align: 'center',
      defaultSlot: ({ row }) => renderOps([
        { type: 'edit', onClick: () => modal.edit(row.id) },
      ]),
    },
  ]);
}
```

### 5.2 新增 COLUMN_AUTO_MAP 字段

当项目有自定义状态字段时，扩展到 common preset：

```typescript
// runtime/presets/my-biz.ts（用 wl-ui add-preset my-biz 生成）
import { createPreset } from '@agile-team/wl-skills-ui/runtime';

export const installMyBizPreset = createPreset({
  name: 'my-biz',
  columnAutoMap: {
    myStatus: {
      width: 90, align: 'center',
      defaultSlot: ({ row }) => renderMyStatus(row.myStatus),
    },
  },
  tagMaps: {
    myStatus: {
      '0': { label: '待处理', type: 'info' },
      '1': { label: '处理中', type: '' },
      '2': { label: '已完成', type: 'success' },
    },
  },
});
```

### 5.3 styles/presets/skin → full 切换

```scss
// 确认没有布局冲突后，把：
@use '@agile-team/wl-skills-ui/styles/presets/skin' as *;
// 改为：
@use '@agile-team/wl-skills-ui/styles' as *;
```

**验证方式：** 跑冒烟测试，确认以下页面类型视觉无异常：
- 列表页（.list-page 骨架生效）
- 左树右表页（.tree-list 骨架生效）
- 表单弹窗（.form-dialog 骨架生效）

---

## 六、回退机制

每步迁移都是**加法或替换**，不是删除原有代码：

| 步骤 | 回退方式 |
|---|---|
| styles full → skin | 改回 `@use '...presets/skin'` |
| defineColumns 迁移 | git revert 单个文件 |
| installCommonPreset | 注释掉 `installCommonPreset()` 调用 |

---

## 关联资源

- 渐进迁移流程：[_flows/progressive-migrate](../../_flows/progressive-migrate.md)
- 审计先行：[ops/audit](../audit/SKILL.md)
- 运行时迁移：[runtime/migration](../../runtime/migration/SKILL.md)
