<template>
  <el-form>
    <el-form-item label="名称">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item label="类型">
      <el-select v-model="form.type" />
    </el-form-item>
  </el-form>
</template>
