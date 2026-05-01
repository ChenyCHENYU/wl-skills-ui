---
description: |
  详情页骨架 Skill — 检测/对齐 .detail-page 只读展示页面结构，
  适用于流程详情、档案详情、记录详情等以 el-descriptions 或自定义 label-value 为主的页面。
applyTo: "**/*.vue"
---

# layouts/detail-page SKILL

## 适用场景

**只读展示页**：以 `el-descriptions` 或自定义 label-value 卡片为主，可附带子表格（只读）。

---

## Detect — 识别详情页

```
检测条件（满足任意 2 项即判定）：
✓ 文件名含 Detail / Info / Profile / View（如 DetailPage.vue / InfoView.vue）
✓ 页面以 el-descriptions 为主体
✓ 路由 path 含 /detail/:id 或 /view/:id
✓ 页面顶部有面包屑 + 返回按钮
✓ 无 el-form 表单提交逻辑
```

---

## Diagnose — 诊断问题

| 问题 | 规则 | 说明 |
|---|---|---|
| 根节点缺少 `.detail-page` | L-301 | 应为 `<div class="detail-page">` |
| 子表格有操作列文字按钮 | R015 | 详情页内嵌 el-table 也须用 jh-op-btn（仅下载/查看类图标）|
| 状态字段纯文本展示 | R009 | 详情页状态字段也应用 renderTagNode |
| label-value 未用统一 class | L-302 | 自定义 label-value 应用 `.detail-item` 统一间距 |
| 硬编码颜色 | R016-R018 | 详情页强调色应用 CSS Token |

---

## Repair — 修复指引

### 标准结构（el-descriptions 版）

```vue
<template>
  <div class="detail-page">
    <!-- 顶部操作栏 -->
    <div class="detail-page__header">
      <el-page-header @back="$router.back()" :content="pageTitle" />
      <div class="detail-page__actions">
        <el-button icon="Edit" @click="handleEdit">编辑</el-button>
      </div>
    </div>

    <!-- 基本信息卡片 -->
    <el-card class="detail-page__card" header="基本信息">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称">{{ info.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <component :is="renderTagNode(info.enableStatus, ENABLE_STATUS_MAP)" />
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ info.createTime }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ info.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 子表格（只读，可选） -->
    <el-card class="detail-page__card" header="关联记录">
      <el-table :data="subList" empty-text="暂无数据">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="名称" align="center" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <button class="jh-op-btn jh-op-view" title="查看" @click="viewAttach(row)">
              <el-icon><View /></el-icon>
            </button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
```

### SCSS 对应

```scss
// styles/layouts/_detail-page.scss 已提供基础骨架
// .detail-page__card 提供卡片间距
// .detail-page__header 提供顶部操作栏布局
```

---

## 关联资源

- 样式实现：[styles/layouts/_detail-page.scss](../../../styles/layouts/_detail-page.scss)
- 相关 skills：[element/el-table](../../element/el-table/SKILL.md) | [layouts/form-dialog](../form-dialog/SKILL.md)
