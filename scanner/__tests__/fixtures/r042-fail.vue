<template>
  <el-date-picker size="small" style="width:100%" />
</template>

<style>
.form-date .el-date-picker {
  width: 100%;
  position: fixed;
  inset: 0;
}

/* 安全分支与危险分支并列时，不能因为前者已限定 popper 就漏报后者。 */
.el-picker__popper .el-date-picker,
.dialog-form .el-date-picker {
  width: 100dvw;
}
</style>
