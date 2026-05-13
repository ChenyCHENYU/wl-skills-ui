<template>
  <el-table :data="list">
    <el-table-column type="selection" width="55" />
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="status" label="状态" align="left" />
  </el-table>
</template>
