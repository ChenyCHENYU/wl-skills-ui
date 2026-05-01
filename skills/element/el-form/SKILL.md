---
description: |
  表单控件规范 Skill — el-input / el-select / el-date-picker / el-form 的尺寸、宽度、labelWidth 标准。
  覆盖规则：R006 R007 R008。
applyTo: "**/*.vue"
---

# 表单控件规范

## R006 — el-input / el-select 必须 `size="small"` 【中危】

全局统一 `size="small"`，确保 32px 高度的密度体验。

```diff
- <el-input v-model="form.name" placeholder="请输入">
+ <el-input size="small" v-model="form.name" placeholder="请输入">

- <el-select v-model="form.type">
+ <el-select size="small" v-model="form.type">
```

> 可以通过全局配置 `ElConfigProvider` 统一设置，但建议显式声明，避免嵌套组件污染。

---

## R007 — el-date-picker 必须 `style="width:100%"` 【中危】

el-date-picker 默认宽度不会自动撑满 el-form-item，必须显式设置。

```diff
- <el-date-picker v-model="form.date" type="date" placeholder="请选择">
+ <el-date-picker style="width:100%" v-model="form.date" type="date" placeholder="请选择">
```

---

## R008 — el-form `labelWidth` 建议 ≥ 150px 【低危】

```diff
- <el-form :model="form" labelWidth="100px">
+ <el-form :model="form" labelWidth="150px">
```

> 本系统内最长标签"隐患排查内容及标准"9字 ≈ 126px + padding ≈ 142px，`150px` 为安全兜底值。
> 此规则**需人工确认**，不自动修改（部分特殊布局可能需要不同值）。

---

## 完整标准表单示例

```html
<el-form :model="form" label-width="150px" label-position="right">
  <el-row :gutter="20">
    <el-col :span="12">
      <el-form-item label="姓名" prop="name">
        <el-input size="small" v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="所属部门" prop="dept">
        <el-select size="small" v-model="form.dept" placeholder="请选择">
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
        />
      </el-form-item>
    </el-col>
  </el-row>
</el-form>
```
