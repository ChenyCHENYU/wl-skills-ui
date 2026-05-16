<template><BaseTable :columns="columns" /></template>
<script setup>
const columns = [
  { label: "状态", name: "status", options: STATUS_OPTIONS },
  { label: "类型", name: "type", options: [{ label: '启用', value: 1 }, { label: '禁用', value: 0 }] },
]
</script>
