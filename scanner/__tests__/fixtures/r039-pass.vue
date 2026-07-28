<template>
  <el-table :data="rows">
    <el-table-column type="selection" />
    <el-table-column
      prop="customerName"
      label="客户名称"
      show-overflow-tooltip
    />
  </el-table>
</template>
