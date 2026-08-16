<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { ref } from "vue";

const form = ref({
  name: "烟台华新数智化项目",
  remark: "统一的业务表单聚焦边框",
  quantity: 14.4,
  station: "STATION-02",
});

const topPaneHeight = ref(220);

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
      <div class="visual-contract-row">
        <ul
          class="el-dropdown-menu action-dropdown-menu visual-action-dropdown-menu"
          data-testid="action-dropdown-menu"
        >
          <li class="el-dropdown-menu__item">
            <button class="el-button el-button--primary el-button--small" type="button">
              ATP释放
            </button>
          </li>
        </ul>
        <ElPagination
          class="visual-pagination"
          data-testid="pagination-contract"
          size="small"
          background
          layout="prev, pager, next"
          :page-size="10"
          :total="30"
        />
      </div>
      <div
        class="el-message-box visual-legacy-message-box"
        data-testid="legacy-message-box"
      >
        <div class="el-message-box__content">
          <div class="el-message-box__container" data-testid="message-box-container">
            <span class="el-message-box__status el-message-box-icon--warning">!</span>
            <div class="el-message-box__message" data-testid="message-box-message">
              <p>确认注销并退出系统吗？</p>
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
          <ElFormItem label="复合数值">
            <div
              class="com-inputNumber-content el-input-number el-input__wrapper text-right"
              data-testid="jh-input-number"
            >
              <span class="el-input-number__decrease" data-testid="jh-number-decrease">−</span>
              <span class="el-input-number__increase" data-testid="jh-number-increase">+</span>
              <div class="el-input">
                <div class="el-input__wrapper" data-testid="jh-number-inner-wrapper">
                  <input
                    class="el-input__inner"
                    type="number"
                    value="13.00"
                    placeholder="请输入工序处理次数"
                  />
                </div>
              </div>
            </div>
          </ElFormItem>
          <ElFormItem label="作业站">
            <ElInput v-model="form.station" data-testid="input-group">
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
              <template #append>
                <ElIcon data-testid="input-group-search"><Search /></ElIcon>
              </template>
            </ElInput>
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

    <section class="visual-section" data-testid="split-section">
      <h2>上下分屏表格重布局</h2>
      <button data-testid="resize-split" type="button" @click="topPaneHeight = 120">
        收缩上表
      </button>
      <div class="drager_row visual-drag-row" data-testid="split-root">
        <div
          class="drager_top flex flex-col"
          :style="{ flexBasis: `${topPaneHeight}px` }"
          data-testid="split-top-pane"
        >
          <div class="visual-split-pane-content">
            <div class="visual-split-toolbar">上表工具栏</div>
            <div
              class="base-table ag-theme-quartz ag-grid-table"
              data-testid="split-grid-host"
            >
              <div class="ag-root-wrapper">
                <div class="ag-body-viewport" data-testid="split-grid-viewport">
                  <div class="visual-grid-content">AG Grid 长内容</div>
                </div>
              </div>
            </div>
            <div class="jh-pagination">分页</div>
          </div>
        </div>
        <div class="slider_row"></div>
        <div class="drager_bottom"><span>下表区域</span></div>
      </div>
    </section>

    <section class="visual-section" data-testid="empty-grid-section">
      <h2>多表格完整空状态</h2>
      <div
        class="drager_row visual-empty-drag-row"
        data-testid="empty-split-root"
      >
        <div class="drager_top" data-testid="empty-top-pane">
          <div
            class="ag-grid-table visual-empty-grid"
            data-testid="empty-top-grid"
          >
            <div class="ag-root-wrapper">
              <div class="ag-header"><div class="visual-empty-header-row">上表表头</div></div>
              <div class="ag-body"><div class="ag-body-viewport"></div></div>
              <div class="ag-overlay">
                <div class="ag-overlay-no-rows-wrapper" data-testid="empty-top-overlay">
                  <span class="ag-overlay-no-rows-center">暂无数据</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="slider_row"></div>
        <div class="drager_bottom" data-testid="empty-bottom-pane">
          <div
            class="ag-grid-table visual-empty-grid has-group-header"
            data-testid="empty-bottom-grid"
          >
            <div class="ag-root-wrapper">
              <div class="ag-header">
                <div class="ag-header-row-column-group visual-empty-header-row">分组表头</div>
                <div class="visual-empty-header-row">明细表头</div>
              </div>
              <div class="ag-body"><div class="ag-body-viewport"></div></div>
              <div class="ag-overlay">
                <div class="ag-overlay-no-rows-wrapper" data-testid="empty-bottom-overlay">
                  <span class="ag-overlay-no-rows-center">暂无数据</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <div
        class="base-table ag-theme-quartz visual-ag-table"
        data-testid="ag-grid-contract"
      >
        <div class="ag-root-wrapper">
          <div class="visual-ag-header-row">
            <div class="ag-header-cell wl-ui-table-header-align--left">
              <div class="ag-header-cell-comp-wrapper">
                <div class="ag-header-cell-label"><span data-testid="ag-left-header-text">左对齐列</span></div>
              </div>
            </div>
            <div class="ag-header-cell ag-right-aligned-header">
              <div class="ag-header-cell-comp-wrapper">
                <div class="ag-header-cell-label" data-testid="ag-right-header">
                  <span data-testid="ag-right-header-text">右对齐列</span>
                </div>
              </div>
            </div>
          </div>
          <div class="ag-row ag-row-selected visual-ag-row">
            <div
              class="ag-cell ag-cell-value ag-left-aligned-cell wl-ui-table-cell-align--left ag-cell-focus"
              data-testid="ag-focus-cell"
            >
              <span data-testid="ag-left-cell-text">混排 GA202603 一道门</span>
            </div>
            <div
              class="ag-cell ag-cell-value ag-right-aligned-cell"
              data-testid="ag-right-cell"
            >
              <span data-testid="ag-right-cell-text">2026-06-09 09:16:55</span>
            </div>
          </div>
          <div
            class="ag-cell ag-cell-value editable-cell visual-edit-cell"
            data-testid="ag-edit-cell"
          >
            <div class="el-select"><div class="el-select__wrapper"></div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="visual-section session-login" data-testid="exempt-section">
      <h2>定制区域豁免</h2>
      <ElButton type="primary">登录页定制按钮</ElButton>
      <ElInput class="login-custom-input-group" model-value="定制输入">
        <template #append><ElIcon><Search /></ElIcon></template>
      </ElInput>
    </section>
  </main>
</template>
