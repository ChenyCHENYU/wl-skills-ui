# TPL-TREE-LIST — 左树右表布局模板

> 适用：左侧组织树 + 右侧数据列表的经典后台管理布局。

> 与 `wl-skills-kit` 协同说明：本模板是 `wk-skills-ui` 面向通用项目的 UI 示例，保留对纯 Element Plus、老旧封装和非 kit 项目的参考价值。若项目选择使用 `wl-skills-kit` 生成或规范化重构页面，则页面结构以 kit 的 `page-codegen/templates/universal/TPL-TREE-LIST.md` 为准；`wk-skills-ui` 继续负责 tokens/styles、化妆层、`defineColumns()`、`renderOps()` 等 UI 能力。

## 布局结构

```
.tree-list-container
  ├── .tree-panel     左侧树（固定宽度 240px）
  └── .list-panel     右侧列表（自适应）
```

## 模板代码

```vue
<template>
  <div class="tree-list-container">
    <!-- 左侧树 -->
    <div class="tree-panel">
      <div class="tree-search">
        <el-input
          size="small"
          v-model="treeKeyword"
          placeholder="搜索"
          prefix-icon="Search"
          clearable
        />
      </div>
      <el-scrollbar height="calc(100vh - 160px)">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="{ label: 'name', children: 'children' }"
          :filter-node-method="filterNode"
          node-key="id"
          highlight-current
          @node-click="handleNodeClick"
        />
      </el-scrollbar>
    </div>

    <!-- 右侧列表 -->
    <div class="list-panel">
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
        <el-button
          type="primary"
          icon="Plus"
          :disabled="!selectedNodeId"
          @click="modal.add()"
        >
          新增
        </el-button>
      </div>

      <!-- 表格 -->
      <BaseTable :hook="page" empty-text="暂无数据" :columns="columnsDef()" />

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="page.current"
        v-model:page-size="page.size"
        :total="page.total"
        layout="total, sizes, prev, pager, next"
        @current-change="page.load"
        @size-change="page.load"
      />
    </div>
  </div>

  <ModuleModal ref="modal" @success="page.load" />
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { defineColumns, renderOps } from "@agile-team/wk-skills-ui/runtime";

const treeRef = ref();
const treeKeyword = ref("");
const selectedNodeId = ref<string>("");
const treeData = ref([]);

// 树节点过滤
watch(treeKeyword, (val) => treeRef.value?.filter(val));
function filterNode(value: string, data: any) {
  if (!value) return true;
  return data.name?.includes(value);
}

function handleNodeClick(node: any) {
  selectedNodeId.value = node.id;
  page.load(1);
}

// 列表逻辑...
const searchForm = reactive({ name: "" });
const page = usePageHook({
  apiFn: getList,
  params: () => ({ ...searchForm, nodeId: selectedNodeId.value }),
});

function handleSearch() {
  page.load(1);
}
function handleReset() {
  searchForm.name = "";
  page.load(1);
}

const modal = ref();

function columnsDef() {
  return defineColumns([
    { type: "index", label: "序号", width: 60, align: "center" },
    { name: "name", label: "名称", minWidth: 150 },
    {
      label: "操作",
      width: 100,
      fixed: "right",
      align: "center",
      defaultSlot: ({ row }) =>
        renderOps([
          { type: "edit", onClick: () => modal.value.edit(row.id) },
          { type: "del", onClick: () => handleDel(row.id) },
        ]),
    },
  ]);
}
</script>

<style lang="scss" scoped>
// 注意：.tree-list-container 的 flex 布局已由 wk-skills-ui/styles/shared/_layout.scss 提供
// 只需保证 class 名一致，样式自动生效
.tree-list-container {
  display: flex;
  height: 100%;
  gap: 12px;
}
.tree-panel {
  width: 240px;
  flex-shrink: 0;
}
.list-panel {
  flex: 1;
  overflow: hidden;
}
</style>
```

## 注意事项

1. `_layout.scss` 提供了 `.tree-list-container` 等基础 flex 布局，无需重复定义
2. 左侧树点击时重置分页到第 1 页
3. 工具栏新增按钮在未选中树节点时禁用（防止无效数据关联）
