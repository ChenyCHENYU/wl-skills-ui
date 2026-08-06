<script setup lang="ts">
import { ref } from "vue";

const form = ref({
  name: "烟台华新数智化项目",
  remark: "统一的业务表单聚焦边框",
  quantity: 14.4,
});

const rows = [
  { id: 1, customer: "江苏武进不锈股份有限公司", grade: "热轧" },
  { id: 2, customer: "蓝德鑫泰新材料股份有限公司", grade: "热轧" },
  { id: 3, customer: "烟台华新数智化信息化改造项目", grade: "冷轧" },
];

function rowClassName({ row }: { row: { id: number } }) {
  return row.id === 2 ? "current-row" : "";
}
</script>

<template>
  <main id="visual-harness">
    <section class="visual-section" data-testid="actions-section">
      <h2>动作与状态色</h2>
      <div class="visual-row">
        <ElButton type="primary">新增</ElButton>
        <ElButton type="primary" disabled>禁用主按钮</ElButton>
        <ElButton type="success">批量保存</ElButton>
        <ElButton type="warning">取消审批</ElButton>
        <ElButton type="danger">删除</ElButton>
        <div class="base-toolbar-box">
          <div class="action-button-wrap">
            <div class="el-dropdown">
              <div class="el-button-group" data-testid="split-button">
                <button class="el-button el-button--primary" type="button">导出报表</button>
                <button
                  class="el-button el-button--primary el-dropdown__caret-button"
                  type="button"
                  aria-label="更多动作"
                >
                  <span>⌄</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="visual-section" data-testid="form-section">
      <h2>表单与复合控件</h2>
      <ElForm :model="form" label-width="92px" size="small">
        <div class="form-grid">
          <ElFormItem label="项目名称">
            <ElInput v-model="form.name" />
          </ElFormItem>
          <ElFormItem label="数量">
            <ElInputNumber v-model="form.quantity" :controls="false" data-testid="input-number" />
          </ElFormItem>
          <ElFormItem label="价格因素说明" class="wide-field">
            <ElInput
              v-model="form.remark"
              type="textarea"
              :rows="3"
              data-testid="textarea"
            />
          </ElFormItem>
          <ElFormItem label="抄送人" class="wide-field">
            <div class="com-userPicker picker-wrap visual-composite">
              <div
                class="com-input-multi-tag-wrap el-input el-input__wrapper"
                data-testid="composite-owner"
              >
                <div class="com-input-multi-tag">
                  <span class="el-tag">王月</span>
                  <span class="el-tag">潘灵连</span>
                  <span class="el-tag">张志远</span>
                  <span class="el-tag">李明</span>
                  <span class="el-tag">赵敏</span>
                  <div class="el-input">
                    <div class="el-input__wrapper" data-testid="composite-inner">
                      <input class="el-input__inner" placeholder="请选择或输入" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ElFormItem>
        </div>
      </ElForm>
    </section>

    <section class="visual-section" data-testid="table-section">
      <h2>长文本与行状态</h2>
      <ElTable
        :data="rows"
        :row-class-name="rowClassName"
        border
        data-testid="business-table"
      >
        <ElTableColumn prop="id" label="序号" width="80" />
        <ElTableColumn prop="customer" label="客户名称" width="190" />
        <ElTableColumn prop="grade" label="产品别" width="110" />
        <ElTableColumn label="操作" min-width="150">
          <template #default>
            <ElButton link type="warning">复制</ElButton>
            <ElButton link type="danger">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </section>

    <section class="visual-section session-login" data-testid="exempt-section">
      <h2>定制区域豁免</h2>
      <ElButton type="primary">登录页定制按钮</ElButton>
    </section>
  </main>
</template>
