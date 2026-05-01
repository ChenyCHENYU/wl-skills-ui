# TPL-FORM-DIALOG — 标准表单弹窗模板

> 适用：新增/编辑弹窗，含表单验证、查看模式（只读）、成功回调。

## 模板代码

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="700px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="150px"
      :disabled="optr === 'view'"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input
              size="small"
              v-model="form.name"
              placeholder="请输入名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属部门" prop="deptId">
            <el-select
              size="small"
              v-model="form.deptId"
              placeholder="请选择"
              style="width:100%"
            >
              <el-option
                v-for="o in deptOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="开始日期" prop="startDate">
            <el-date-picker
              style="width:100%"
              size="small"
              v-model="form.startDate"
              type="date"
              placeholder="请选择日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input
              size="small"
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-if="optr !== 'view'"
        type="primary"
        :loading="saving"
        @click="handleSubmit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
// import { addModule, updateModule, getModuleDetail } from '@/api/module';

const emit = defineEmits(['success']);

// ── 状态 ────────────────────────────────────────────────────────────────────
const visible = ref(false);
const optr = ref<'add' | 'edit' | 'view'>('add');
const saving = ref(false);
const formRef = ref();

// ── 表单数据 ──────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', deptId: undefined, startDate: '', remark: '' };
const form = reactive({ ...EMPTY_FORM });

// ── 验证规则 ──────────────────────────────────────────────────────────────────
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
};

// ── 计算标题 ──────────────────────────────────────────────────────────────────
const title = computed(() => ({ add: '新增', edit: '编辑', view: '查看' }[optr.value] || '');

// ── 打开弹窗 ──────────────────────────────────────────────────────────────────
async function add() {
  optr.value = 'add';
  Object.assign(form, EMPTY_FORM);
  visible.value = true;
}
async function edit(id: string) {
  optr.value = 'edit';
  // const data = await getModuleDetail(id);
  // Object.assign(form, data);
  visible.value = true;
}
async function view(id: string) {
  optr.value = 'view';
  // const data = await getModuleDetail(id);
  // Object.assign(form, data);
  visible.value = true;
}
defineExpose({ add, edit, view });

// ── 提交 ──────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    // if (optr.value === 'add') await addModule(form);
    // else await updateModule(form);
    ElMessage.success('操作成功');
    visible.value = false;
    emit('success');
  } finally {
    saving.value = false;
  }
}

function handleClosed() {
  formRef.value?.resetFields();
}
</script>
```

## 注意事项

1. `label-width="150px"` — 统一标准（R008）
2. `el-input` / `el-select` 必须 `size="small"`（R006）
3. `el-date-picker` 必须 `style="width:100%"`（R007）
4. 查看模式用 `:disabled="optr === 'view'"`，不重复渲染
5. `<template #footer>` 只放操作按钮，不放分页（R011）
