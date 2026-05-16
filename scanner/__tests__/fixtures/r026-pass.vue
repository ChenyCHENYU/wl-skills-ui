<template>
  <el-form>
    <el-form-item label="名称">
      <el-input v-model="name" />
    </el-form-item>
    <el-form-item label="类型">
      <el-select v-model="type"><el-option label="A" value="a" /></el-select>
    </el-form-item>
    <el-button type="primary">提交</el-button>
  </el-form>
</template>
