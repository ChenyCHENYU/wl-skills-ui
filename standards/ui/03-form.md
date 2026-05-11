# 规范 03：表单（el-form）

## 规则 R008：labelWidth 统一使用 150px

中文标签最长 9 字（如"隐患排查内容及标准"），需要 150px 才不截断：

```vue
<!-- ❌ 错误：100px 会截断9字标签 -->
<el-form :model="form" label-width="100px">

<!-- ✅ 正确 -->
<el-form :model="form" label-width="150px">
```

---

## 规则 R006：el-input / el-select 必须加 size="small"

系统统一使用 small 尺寸，与表格行高匹配：

```vue
<!-- ❌ 错误 -->
<el-input v-model="form.name" />
<el-select v-model="form.type">

<!-- ✅ 正确 -->
<el-input v-model="form.name" size="small" />
<el-select v-model="form.type" size="small">
```

---

## 规则 R007：el-date-picker 必须加 style="width:100%"

date-picker 默认宽度固定，在 grid 布局中需撑满列宽：

```vue
<!-- ❌ 错误 -->
<el-date-picker v-model="form.date" type="date" />

<!-- ✅ 正确 -->
<el-date-picker v-model="form.date" type="date" style="width:100%" />
```

---

## 规则：表单控件圆角必须统一

输入、选择、日期、数字输入、级联、自动完成、textarea、上传拖拽区都属于表单控件家族，圆角必须使用统一 token：

```scss
--wk-form-control-radius
```

业务页面不要给单个控件硬编码不同 `border-radius`。确有特殊场景时，在页面容器覆盖 token，而不是逐个控件写死。

---

## 布局标准

### 搜索区（列表页顶部）

```vue
<el-form :inline="true" :model="queryForm" size="small">
  <el-form-item label="关键词">
    <el-input v-model="queryForm.keyword" size="small" placeholder="请输入" />
  </el-form-item>
  <el-form-item label="状态">
    <el-select v-model="queryForm.status" size="small" placeholder="请选择" clearable>
      <el-option label="启用" :value="1" />
      <el-option label="停用" :value="0" />
    </el-select>
  </el-form-item>
  <el-form-item>
    <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
    <el-button size="small" @click="handleReset">重置</el-button>
  </el-form-item>
</el-form>
```

### 弹窗表单（新增/修改）

```vue
<el-form
  ref="formRef"
  :model="form"
  :rules="rules"
  label-width="150px"
>
  <el-row :gutter="20">
    <el-col :span="12">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" size="small" />
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="form.date"
          type="date"
          style="width:100%"
          size="small"
        />
      </el-form-item>
    </el-col>
  </el-row>
</el-form>
```

---

## 复杂表单判断

| 条件 | 方案 |
|-----|------|
| 字段 ≤ 15，无子表 | 弹窗（`el-dialog`） |
| 字段 > 15，或含多个子表 | 独立路由页（`/xxx-form`） |
| Tab > 3 个 | 独立路由页 |

---

## 校验规则命名

```typescript
const rules = {
  name:   [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type:   [{ required: true, message: '请选择类型', trigger: 'change' }],
  date:   [{ required: true, message: '请选择日期', trigger: 'change' }],
}
```
