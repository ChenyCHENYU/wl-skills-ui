<template>
  <el-dialog
    :modelValue="props.selectPopupVisible"
    :width="selectPopupWidth"
    :title="props.selectPopupTitle"
    :before-close="dialogCancel"
    modal-class="custom-select-dialog"
  >
    <!-- 弹窗头部 -->
    <template #header>
      <div class="header">
        <span>{{ selectPopupTitle }}</span>
      </div>
    </template>
    <div class="edl-dialog-div">
      <el-form
        :model="queryParams"
        ref="queryForm"
        :inline="true"
        @submit.native.prevent
      >
        <!-- label-width="60px" -->
        <el-row :gutter="20">
          <!-- 将父组件传输过来的数据动态挂载 -->
          <template v-for="item in props.tableSearch" :key="item.prop">
            <el-col :span="6">
              <el-form-item
                :prop="item.prop"
                :label="item.label"
                style="width: 100%"
              >
                <!-- 条件渲染表单项目类型 -->
                <template v-if="item.type === 'input'">
                  <el-input
                    style="width: 100%"
                    :placeholder="item.placeholder"
                    size="small"
                    v-model="queryParams[item.prop]"
                  ></el-input>
                </template>
                <template v-if="item.type === 'datePicker'">
                  <el-date-picker
                    style="width: 100%"
                    v-model="queryParams[item.prop]"
                    size="small"
                    type="daterange"
                    format="YYYY/MM/DD"
                    value-format="YYYY-MM-DD"
                    range-separator="-"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                  />
                </template>
                <template v-if="item.type === 'select'">
                  <el-select
                    v-model="queryParams[item.prop]"
                    :placeholder="item.placeholder"
                    size="small"
                  >
                    <el-option
                      v-for="item in item.options"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </template>
                <template v-if="item.type === 'cascader'">
                  <el-cascader
                    v-model="queryParams[item.prop]"
                    :options="item.options"
                    :props="{
                      value: 'id',
                      label: 'deptName',
                      children: 'children',
                      emitPath: false,
                      checkStrictly: true
                    }"
                    style="width: 100%"
                  />
                </template>
                <template v-if="item.type === 'radio'">
                  <el-radio-group v-model="queryParams[item.prop]">
                    <el-radio-button
                      v-for="items in item.options"
                      :key="items.value"
                      :label="items.value"
                    >
                      {{ items.label }}
                    </el-radio-button>
                  </el-radio-group>
                </template>
              </el-form-item>
            </el-col>
          </template>
          <el-col :span="4">
            <el-form-item>
              <div class="flex">
                <el-button
                  type="primary"
                  icon="Search"
                  size="small"
                  @click="handleQuery"
                  >搜索</el-button
                >
                <el-button icon="Refresh" size="small" @click="resetQuery"
                  >重置</el-button
                >
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <slot name="customContent"></slot>
      <!-- <el-row :span="24" :gutter="10">
        <el-col :span="20">
          <p class="el-col-header l">列表信息</p>
        </el-col>
        <el-col :span="4">
          <p class="el-col-header r">已选择</p>
        </el-col>
      </el-row> -->
      <el-row :span="24" :gutter="10">
        <el-col :span="18">
          <!-- 利用loading重新渲染表格，放置移除不在当前数据也得数据勾选情况未取消勾选 -->
          <el-table
            v-loading="loading"
            :data="tableSource"
            :row-key="getRowKeys"
            @row-click="rowClickEv"
            @select="handleSelectionChange"
            @select-all="handleSelectAll"
            ref="popupTable"
            :row-style="rowStyle"
          >
            <el-table-column
              type="selection"
              align="center"
              width="55"
              :reserve-selection="false"
              v-if="props.tableMultiple"
            ></el-table-column>
            <el-table-column
              label="序号"
              align="center"
              type="index"
              width="60"
              :index="table_index"
            />
            <el-table-column
              align="center"
              v-for="(item, i) in props.tableClumnList"
              :key="i"
              :label="item.label"
              :prop="item.value"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span v-if="item.type == 'dict'">
                  {{ getDictLabel(item.dictOptions, row[item.value]) }}
                </span>
                <span v-else>
                  {{ row[item.value] }}
                </span>
              </template>
            </el-table-column>
          </el-table>
          <div class="popup-pagination">
            <pagination
              v-show="total > 0"
              :total="total"
              v-model:page="queryParams.current"
              v-model:limit="queryParams.size"
              @pagination="getList"
              @handleSizeChange="handleSizeChange"
              @handleCurrentChange="handleCurrentChange"
            />
          </div>
        </el-col>
        <el-col :span="6">
          <div class="selectUl">
            <el-tag
              v-for="(tagItem, tagIndex) in multipleSelection"
              :key="tagItem.id"
              closable
              @close="handleClose(tagItem, tagIndex)"
            >
              {{ tagItem[props.tagShowName] }}
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogCancel" size="small">取消</el-button>
        <el-button type="primary" @click="submitForm" size="small">确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script setup>
import { ElMessage } from "element-plus";
import { nextTick } from "vue";
import { getAction } from "@jhlc/common-core/src/api/action";
import pagination from "@/views/safe/components/Pagination/index.vue";

// 默认不传值，  为人员单选
const props = defineProps({
  // 显示隐藏
  selectPopupVisible: {
    type: Boolean,
    default: false
  },
  // 默认标题
  selectPopupTitle: {
    type: String,
    default: "选择"
  },
  // 弹窗宽度
  selectPopupWidth: {
    type: String,
    default: "70%"
  },
  //是否多选  默认false
  tableMultiple: {
    type: Boolean,
    default: false
  },
  //搜索数据
  tableSearch: {
    type: Array,
    default: () => [
      {
        type: "input",
        placeholder: "请输入姓名查询",
        prop: "userName"
      },
      {
        type: "input",
        placeholder: "请输入工号查询",
        prop: "userNo"
      }
    ]
  },
  // 传递的参数
  queryParam: {
    type: Object,
    default: function () {
      return {};
    }
  },
  // 接口默认地址(人员列表)
  tableDataUrl: {
    type: String,
    default: "/integrated/aqHrUser/list"
  },
  // 默认展示的列
  tableClumnList: {
    type: Array,
    default: () => [
      {
        label: "姓名",
        value: "userName"
      },
      {
        label: "工号",
        value: "userNo"
      },
      {
        label: "联系方式",
        value: "mobilePhone"
      },
      {
        label: "所属单位",
        value: "deptName"
      }
    ]
  },
  tagShowName: {
    type: String,
    default: "name"
  },
  // 回显的数据
  tableSelectData: {
    type: Object,
    default: () => []
  },
  // 回显勾选的标志
  checkFlag: {
    type: String,
    default: "id"
  }
});

const queryForm = ref(); //搜索
const popupTable = ref(); //表格

// 遮罩层
const loading = ref(true);
// 总条数
const total = ref(0);
// 表格数据
const tableSource = ref([]);
// 查询参数
const queryParams = ref({
  current: 1,
  size: 10
});
//选中的数据
const multipleSelection = ref([]);

const emit = defineEmits(["selectPopupBack"]);

// 查询列表数据
function getList() {
  loading.value = true;
  let params = { ...queryParams.value };
  if (queryParams.value.timeValue) {
    params["startTime"] = params.timeValue[0];
    params["endTime"] = params.timeValue[1];
    delete params.timeValue;
  } else {
    params["startTime"] = "";
    params["endTime"] = "";
  }
  let newParams = filterObj(params);
  getAction(props.tableDataUrl, newParams)
    .then((response) => {
      if (props.tableDataUrl == "hrms/user/list") {
        let userD = response.data.records;
        tableSource.value = userD.map((item) => {
          let obj = {
            id: item.user.id,
            userNo: item.user.userNo,
            name: item.user.name,
            phone: item.user.phone,
            deptName: item.dept ? item.dept.strName : "",
            deptId: item.dept ? item.dept.id : ""
          };
          return obj;
        });
      } else {
        tableSource.value = response.data.records;
      }
      total.value = response.data.total;
      console.log("-----total", total.value);
      loading.value = false;
      nextTick(() => {
        tableSource.value.forEach((item) => {
          if (
            multipleSelection.value.findIndex(
              (v) => v[props.checkFlag] == item[props.checkFlag]
            ) >= 0
          ) {
            popupTable.value.toggleRowSelection(item, true);
          }
        });
      });
    })
    .finally(() => {
      loading.value = false;
    });
}

// 过滤空数据
function filterObj(obj) {
  if (!(typeof obj == "object")) {
    return;
  }
  for (let key in obj) {
    if (
      obj.hasOwnProperty(key) &&
      (obj[key] == null || obj[key] == undefined || obj[key] === "")
    ) {
      delete obj[key];
    }
  }
  return obj;
}

// 改变页容量
function handleSizeChange(size) {
  queryParams.value.size = size;
  getList();
}
// 改变页码
function handleCurrentChange(page) {
  queryParams.value.current = page;
  getList();
}
/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.current = 1;
  getList();
}
/** 重置按钮操作 */
function resetQuery() {
  queryForm.value.resetFields();
  handleQuery();
}
//序号连续翻页
function table_index(index) {
  return (queryParams.value.current - 1) * queryParams.value.size + index + 1;
}
function handleSelectionChange(selection, row) {
  rowClickEv(row);
}
//当页全选的方法
function handleSelectAll(rows) {
  if (rows.length) {
    rows.forEach((row) => {
      if (
        !multipleSelection.value.find(
          (item) => item[props.checkFlag] == row[props.checkFlag]
        )
      ) {
        multipleSelection.value.push(row);
      }
    });
  } else {
    tableSource.value.forEach((row) => {
      multipleSelection.value = multipleSelection.value.filter(
        (item) => item[props.checkFlag] != row[props.checkFlag]
      );
    });
  }
}

function getRowKeys(row) {
  return row[props.checkFlag];
}
// 行点击选中
function rowClickEv(row) {
  if (props.tableMultiple) {
    // 多选选中行
    // 根据id判断当前点击的是否被选中
    const selected = multipleSelection.value.some(
      (item) => item[props.checkFlag] === row[props.checkFlag]
    );
    if (!selected) {
      // 选择
      multipleSelection.value.push(row);
      popupTable.value.toggleRowSelection(row, true);
    } else {
      // 取消
      var finalArr = multipleSelection.value.filter((item) => {
        return item[props.checkFlag] !== row[props.checkFlag];
      });
      // 取消后剩余选中的
      multipleSelection.value = finalArr;
      popupTable.value.toggleRowSelection(row, false);
    }
  } else {
    // 单选选中行
    if (multipleSelection.value[0] == row) {
      // 取消
      multipleSelection.value = [];
      popupTable.value.clearSelection();
    } else {
      // 选择
      multipleSelection.value = [row];
      popupTable.value.clearSelection();
      popupTable.value.toggleRowSelection(row, true);
    }
  }
}
// tags移除选中的
function handleClose(item, itemKey) {
  //1. 获取当前页面的:data="tableSource"数据的id(回显勾选的标志)
  const tableSelectItemId = tableSource.value.map(
    (item0) => item0[props.checkFlag]
  );
  //2. 首先循环当前页的:data="tableSource"里的数据进行判断
  for (let i = 0; i < tableSource.value.length; i++) {
    if (tableSource.value[i][props.checkFlag] === item[props.checkFlag]) {
      // 移除当前页选中的数据
      popupTable.value.toggleRowSelection(tableSource.value[i]);
      multipleSelection.value.splice(itemKey, 1);
    } else {
      // 移除非当前页选中的数据
      //3. 然后在判断@select产生的数据
      for (let j = 0; j < multipleSelection.value.length; j++) {
        //4. 判断id是否一样 && 当前页的:data="tableSource"里面不能包含其他页的id
        if (
          multipleSelection.value[j][props.checkFlag] ===
            item[props.checkFlag] &&
          !tableSelectItemId.includes(
            multipleSelection.value[j][props.checkFlag]
          )
        ) {
          popupTable.value.toggleRowSelection(multipleSelection.value[j]);
          multipleSelection.value.splice(itemKey, 1);
        }
      }
    }
  }
}
// 取消按钮
function dialogCancel() {
  multipleSelection.value = []; //取消按钮的时候，置空上一次选择的数据
  emit("update:selectPopupVisible", false);
}

// 确认按钮
function submitForm() {
  if (multipleSelection.value.length > 0) {
    emit("selectPopupBack", multipleSelection.value);
    emit("update:selectPopupVisible", false);
    queryParams.value = {
      current: 1,
      size: 10
    };
  } else {
    ElMessage.warning("您还未选择数据");
    return;
  }
}
// 获取数据字典标签
function getDictLabel(arrDict, value) {
  for (let i in arrDict) {
    if (arrDict[i].value == value) {
      return arrDict[i].label;
    }
  }
}
function rowStyle({ row }) {
  let chekcIdList = [];
  chekcIdList = multipleSelection.value.map((item) => item[props.checkFlag]);
  if (chekcIdList.includes(row[props.checkFlag])) {
    return {
      "background-color": "rgba(94,180,251,0.5)"
    };
  }
}

// 监听父组件传递的数据，编辑回显
watch(
  () => props.tableSelectData,
  (newValue) => {
    // 这里如果想要访问当前页面的一个函数的话必须保证函数在watch这段代码之前，否则会抱函数underfined。如果去掉immediate: true 那么函数位置随意。但是刚进入页面的时候这个函数是不执行的，你必须在onMount里面再去访问一次这个函数。
    if (newValue && newValue.length > 0) {
      multipleSelection.value = newValue;
    }
  },
  //可选immediate: true马上执行
  { deep: true, immediate: true }
);

// 监听搜索参数
watch(
  () => props.queryParam,
  (newValue) => {
    if (newValue) {
      queryParams.value = {
        ...queryParams.value,
        ...newValue
      };
    }
  },
  { deep: true, immediate: true }
);
getList();
// 抛出相应属性方法
defineExpose({
  getList,
  dialogCancel,
  handleQuery,
  queryParams,
  popupTable,
  tableSource
});
</script>
<style lang="scss">
// .custom-select-dialog .el-dialog {
//   margin-left: 40% !important;
// }
</style>
<style lang="scss" scoped>
// 修改鼠标经过表格的颜色
:deep(.el-table tbody tr:hover > td) {
  // 可以选择隐藏
  background-color: transparent !important;
}
.el-col-header {
  line-height: 32px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  margin: 0;
  color: #fff;
  background-color: var(--el-color-primary);
}

.selectUl {
  // height: 560px;
  width: 100%;
  overflow-y: scroll;
  padding: 6px 0;
  // background-color: rgba(245, 247, 250, 1);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  /* 隐藏滚动条的整个部分 */
  &::-webkit-scrollbar {
    display: none;
  }
  :deep(.el-tag) {
    margin: 0 !important;
    margin-bottom: 6px !important;
    width: 100%;
    display: flex;
    justify-content: space-between;
    .el-tag__content {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}
.edl-dialog-div {
  // Token 由 css-var-compile.css 全局统一管理
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
.popup-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
