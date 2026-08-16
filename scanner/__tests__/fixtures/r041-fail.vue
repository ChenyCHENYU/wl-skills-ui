<template>
  <div class="toolbar">
    <el-button type="primary" icon="Plus">新增</el-button>
    <ElButton @click="handleCancel">取消</ElButton>
    <BaseToolbar :items="toolbars" />
  </div>
</template>
