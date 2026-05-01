---
description: |
  表单弹窗骨架 Skill — 检测/对齐 .form-dialog 标准结构（el-dialog + el-form + footer 操作按钮），
  适用于新增/编辑/详情三合一弹窗模式。
applyTo: "**/*.vue"
---

# layouts/form-dialog SKILL

## 适用场景

以 `el-dialog` 承载 `el-form` 的新增/编辑/详情弹窗，支持 `optr: 'add' | 'edit' | 'view'` 三态切换。

---

## Detect — 识别表单弹窗

```
检测条件（满足任意 2 项即判定）：
✓ 文件名含 Modal / Dialog / Form（如 AddModal.vue / EditDialog.vue）
✓ 存在 el-dialog 包裹 el-form
✓ defineExpose 中有 add / edit / view 方法
✓ 存在 optr ref 用于控制表单只读/可写状态
✓ el-dialog footer 中有"确定"/"取消"按钮
```

---

## Diagnose — 诊断问题

| 问题 | 规则 | 说明 |
|---|---|---|
| el-dialog 缺 `.form-dialog` class | L-201 | 应加 `class="form-dialog"` 便于全局覆盖 |
| el-form 缺 `labelWidth="150px"` | R008 | 统一 label 宽度 |
| el-input/el-select 缺 `size="small"` | R006 | 表单控件统一 small |
| el-date-picker 缺 `style="width:100%"` | R007 | 日期控件需撑满容器 |
| footer 中含分页组件 | R011 | 分页不应在 footer 内 |
| 弹窗内嵌套 el-table 操作列用文字按钮 | R015 | 应用 jh-op-btn 图标 |
| 详情态（optr=view）没有禁用所有输入 | L-202 | 应统一用 `:disabled="optr==='view'"` |

---

## Repair — 修复指引

### 标准结构

```vue
<template>
  <el-dialog
    v-model="visible"
    class="form-dialog"
    :title="title"
    width="700px"
    :close-on-click-modal="false"
    @closed="reset"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="optr !== 'view' ? rules : {}"
      label-width="150px"
      label-position="right"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input
              v-model="form.name"
              size="small"
              placeholder="请输入"
              :disabled="optr === 'view'"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="日期" prop="date">
            <el-date-picker
              v-model="form.date"
              type="date"
              size="small"
              style="width:100%"
              :disabled="optr === 'view'"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-if="optr !== 'view'"
        type="primary"
        :loading="saving"
        @click="handleSubmit"
      >确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const visible = ref(false);
const optr = ref('add'); // 'add' | 'edit' | 'view'
const title = computed(() => ({ add: '新增', edit: '编辑', view: '详情' }[optr.value]);

function add() { optr.value = 'add'; reset(); visible.value = true; }
function edit(id) { optr.value = 'edit'; load(id); visible.value = true; }
function view(id) { optr.value = 'view'; load(id); visible.value = true; }

defineExpose({ add, edit, view });
</script>
```

### 三态最佳实践

| 态 | optr | 输入控件 | footer 按钮 |
|---|---|---|---|
| 新增 | `'add'` | 可编辑 | 取消 + 确定 |
| 编辑 | `'edit'` | 可编辑 | 取消 + 确定 |
| 详情 | `'view'` | `disabled` | 仅取消/关闭 |

---

## 关联资源

- 样式实现：[styles/layouts/_form-dialog.scss](../../../styles/layouts/_form-dialog.scss)
- 代码模板：[templates/form-dialog/TPL-FORM-DIALOG.md](../../../templates/form-dialog/TPL-FORM-DIALOG.md)
- 相关 skills：[layouts/list-page](../list-page/SKILL.md) | [element/el-form](../../element/el-form/SKILL.md)
