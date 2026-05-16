<template><BaseTable :columns="columns" /></template>
<script setup>
const columns = [
  { label: "状态", name: "status", defaultSlot: ({ row }) => renderDictClassifyTag(row.status, 'dictKey') },
  { label: "名称", name: "name" },
]
</script>
