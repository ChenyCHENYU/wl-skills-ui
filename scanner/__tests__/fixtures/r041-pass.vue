<template>
  <div class="toolbar">
    <el-button type="primary" size="small" icon="Plus">新增</el-button>
    <ElButton size="large" @click="handlePreview">预览</ElButton>
    <el-button :size="buttonSize" @click="handleCancel">取消</el-button>
    <BaseToolbar size="small" :items="toolbars" />
  </div>
</template>
