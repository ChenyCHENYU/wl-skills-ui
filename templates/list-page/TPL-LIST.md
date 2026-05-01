# TPL-LIST — 标准列表页模板

> 适用：带搜索区 + 工具栏 + 表格 + 分页的标准后台管理列表页。

## 文件结构

```
src/views/[模块]/
  [Module]List.vue          # 页面主组件
  components/
    [Module]Modal.vue       # 新增/编辑弹窗（见 form-dialog 模板）
```

## 模板代码

```vue
<template>
  <div class="page-container">
    <!-- 搜索区 -->
    <div class="search-bar">
      <el-form :model="searchForm" inline>
        <el-form-item label="名称">
          <el-input
            size="small"
            v-model="searchForm.name"
            placeholder="请输入"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            size="small"
            v-model="searchForm.status"
            placeholder="请选择"
            clearable
          >
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="modal.add()"
        >新增</el-button
      >
    </div>

    <!-- 表格 -->
    <BaseTable :hook="page" empty-text="暂无数据" :columns="columnsDef()" />

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="page.current"
      v-model:page-size="page.size"
      :total="page.total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="page.load"
      @size-change="page.load"
    />

    <!-- 弹窗 -->
    <ModuleModal ref="modal" @success="page.load" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { defineColumns, renderOps } from "@agile-team/wk-skills-ui/runtime";
import { usePageHook } from "@/composables/usePageHook";
import ModuleModal from "./components/ModuleModal.vue";
import { getModuleList } from "@/api/module";

// ── 搜索表单 ─────────────────────────────────────────────────────────────────
const searchForm = reactive({ name: "", status: undefined });

// ── 分页 Hook ─────────────────────────────────────────────────────────────────
const page = usePageHook({
  apiFn: getModuleList,
  params: () => ({ ...searchForm }),
});

const handleSearch = () => page.load(1);
const handleReset = () => {
  Object.assign(searchForm, { name: "", status: undefined });
  page.load(1);
};

// ── 弹窗引用 ──────────────────────────────────────────────────────────────────
const modal = ref();

// ── 列定义 ────────────────────────────────────────────────────────────────────
function columnsDef() {
  return defineColumns([
    { type: "index", label: "序号", width: 60, align: "center" },
    { name: "name", label: "名称", minWidth: 120 },
    { name: "status", label: "状态", width: 80 }, // enableStatus 已自动映射
    { name: "remark", label: "备注", minWidth: 160 },
    {
      label: "操作",
      width: 120,
      fixed: "right",
      align: "center",
      defaultSlot: ({ row }) =>
        renderOps([
          { type: "view", onClick: () => modal.value.view(row.id) },
          { type: "edit", onClick: () => modal.value.edit(row.id) },
          { type: "del", onClick: () => handleDel(row.id) },
        ]),
    },
  ]);
}

// ── 删除 ──────────────────────────────────────────────────────────────────────
async function handleDel(id: string) {
  await ElMessageBox.confirm("确定删除该记录？", "提示", { type: "warning" });
  // await deleteModule(id);
  page.load();
}
</script>
```

## 注意事项

1. `BaseTable` 需替换为项目实际使用的表格组件
2. `usePageHook` 需替换为项目实际的分页 Hook
3. `enableStatus` 字段在 `installSafePreset()` 后自动渲染为彩色 Tag，无需手写 defaultNode
4. 工具栏按钮必须带 `icon`（R005 规则）
