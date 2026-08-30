<script setup lang="ts">
const columnsDef = [
  {
    label: "操作",
    defaultSlot: ({ row }) => renderOps([{ type: "edit", onClick: () => edit(row) }]),
  },
];
</script>
