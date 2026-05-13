<template>
  <el-form>
    <el-form-item label="名称">
      <el-input v-model="form.name" size="small" />
    </el-form-item>
    <el-form-item label="类型">
      <el-select v-model="form.type" size="small" />
    </el-form-item>
  </el-form>
</template>
