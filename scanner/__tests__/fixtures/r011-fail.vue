<template>
  <el-dialog v-model="visible" title="列表">
    <el-table :data="list">
      <el-table-column prop="name" label="名称" align="center" />
    </el-table>
    <template #footer>
      <el-pagination :total="total" />
      <el-button @click="visible = false">取消</el-button>
    </template>
  </el-dialog>
</template>
