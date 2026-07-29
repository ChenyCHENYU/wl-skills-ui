# 规范 03：表单（el-form）

## 规则 R008：labelWidth 统一使用 150px

中文标签最长 9 字（如"隐患排查内容及标准"），需要 150px 才不截断：

```vue
<!-- ❌ 错误：100px 会截断9字标签 -->
<el-form :model="form" label-width="100px"></el-form>
```

---

## 规则 R006：el-input / el-select 必须加 size="small"

系统统一使用 small 尺寸，与表格行高匹配：

```vue
<!-- ❌ 错误 -->
<el-input v-model="form.name" />
<el-select v-model="form.type"></el-select>
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

## 规则：label 与控件间距、单行控件高度必须统一

左侧 label 与右侧输入、选择、日期、数字输入、级联、自动完成等单行控件的横向间距统一为：

```scss
--wk-form-label-control-gap: 16px;
```

单行表单控件高度统一为：

```scss
--wk-form-control-height: 26px;
```

textarea 不强制 26px 高度，只继承统一圆角、字体和状态样式。

---

## 规则：紧凑业务表单字号统一为 12px

页面正文仍使用 14px；业务表单的 label、输入值、选择值、picker、textarea、
数字输入框和 placeholder 统一使用：

```scss
--wk-form-font-size: 12px;
```

该规则同时覆盖 Element Plus 2.2 直挂 input DOM、2.3+ wrapper DOM 与 jh-* 封装，
登录页及 `.wl-ui-skin-exempt` / `data-wl-ui-skin="off"` 定制页不参与覆盖。

---

## 规则：textarea 与数字输入框只保留一层状态边框

- textarea 默认使用中性 1px 边框，hover 使用 hover 边框色，focus 强制使用品牌色
  1px 实线与轻外环，不能只依赖平台已有 box-shadow。
- 数字输入框兼容 `.el-input-number > .el-input__wrapper` 和
  `.el-input-number.el-input__wrapper` 两种 DOM；由 wrapper 层绘制唯一边框，
  内部 input 不得再画第二层边框。
- error / disabled 状态继续分别使用危险色和禁用色，不得被 focus 覆盖。

---

## 规则：表单 label 不强制冒号

Element Plus 原生控件、picker 类控件和 jh-\* 封装控件的 label 后不强制追加 `:`。`@jhlc/jh-ui` 的 `.has-colon .com-text:after` / `.text-line-2:after` 冒号注入由 wl-skills-ui 统一屏蔽，避免 input / select / picker 之间出现有的带冒号、有的不带冒号。

---

## 布局标准

### 列数与可用宽度

- 独立作业页/实绩页的主表单最多 4 列；不得为了“一行塞完”使用 5～8 列。
- 单个控件的实际可输入宽度应不小于 160px；标签较长、单位较多或容器变窄时，应主动降为 3 列。
- 字段很多时优先分区、Tab 或“展开更多”，不要压缩输入框。默认区域建议控制在 4～6 行。
- 数字输入若业务不依赖步进操作，应设置 `controls=false`，避免步进按钮挤占内容宽度。

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
<el-form ref="formRef" :model="form" :rules="rules" label-width="150px">
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

| 条件                    | 方案                      |
| ----------------------- | ------------------------- |
| 字段 ≤ 15，无子表       | 弹窗（`el-dialog`）       |
| 字段 > 15，或含多个子表 | 独立路由页（`/xxx-form`） |
| Tab > 3 个              | 独立路由页                |

---

## 校验规则命名

```typescript
const rules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择类型", trigger: "change" }],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
};
```
