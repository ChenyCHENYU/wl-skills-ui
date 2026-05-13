<template>
  <el-table :data="list" empty-text="暂无数据">
    <el-table-column type="selection" align="center" header-align="center" width="55" />
    <el-table-column prop="name" label="名称" align="center" />
    <el-table-column prop="status" label="状态" align="center" />
  </el-table>
</template>
