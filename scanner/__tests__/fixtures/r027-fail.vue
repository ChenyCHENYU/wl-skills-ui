<template>
  <BaseTable :columns="columns" v-loading="loading" />
</template>
<style scoped>
.el-loading-mask {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
