<template>
  <el-dialog v-model="visible" title="列表">
    <el-table :data="list">
      <el-table-column prop="name" label="名称" align="center" />
    </el-table>
    <div class="popup-pagination">
      <el-pagination :total="total" />
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">确定</el-button>
    </template>
  </el-dialog>
</template>
