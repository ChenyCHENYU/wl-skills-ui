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

## R008 — 表单静态标签宽度预警 【低危】

```diff
- <el-form :model="form" labelWidth="100px">
+ <el-form :model="form" labelWidth="150px">
```

> 扫描覆盖 `el-form`、`BaseForm`、`BaseQuery` 的静态 `labelWidth` / `label-width`；150px 只是预警下限，不是所有表单的最终宽度。`jh-ui` 的 `.com-text` 可能强制单行省略，因此长标签（含单位、中英文混排）需按实际字体测量。
> 修复时先量最长标签，再同时检查列宽预算：每列至少容纳标签、间距和 160px 可输入区；不足时降低列数并设置响应式断点。只作用于受影响表单，不全局取消省略或强迫所有页面使用同一个宽度。tooltip 不能代替标签可见。该规则**仅提示人工确认**，不自动修改。
> 浏览器验收至少核对宽屏和窄屏：标签 `scrollWidth <= clientWidth`、输入区 ≥160px、相邻字段不重叠；若业务允许单列移动布局，可在更窄视口单独验收。

---

## 表单控件圆角一致性 【中危】

表单里的输入类控件必须按控件家族统一判断，不要只修 `el-input`：

- 输入：`el-input` / `el-textarea` / `el-input-number`
- 选择：`el-select` / `el-cascader` / `el-autocomplete`
- 日期：`el-date-picker` / `el-time-picker` / range editor
- 上传：`el-upload-dragger` / upload list item

修复时优先使用全局样式 token `--wk-form-control-radius`，不要在业务页面对某几个控件单独写 `border-radius: 0`、`4px`、`10px` 等局部值。若页面需要特殊圆角，应在页面容器上覆盖 token，而不是逐个控件硬编码。

---

## 表单字号与状态边框一致性 【中危】

- 紧凑业务表单的 label、输入值、选择值、picker、textarea、数字值和 placeholder
  统一使用 `--wk-form-font-size: 12px`；不要在某一种组件上单独保留 13px/14px。
- textarea focus 必须是清晰的品牌色实线与轻外环，不能只改 `border-color` 或依赖
  平台默认阴影。
- 数字输入框必须同时检查社区版“wrapper 子节点”和 jh-ui“wrapper 与
  input-number 同节点”两种 DOM，并确保只存在一层可见边框。
- 带 prepend/append 的 input-group 必须由组合根绘制唯一外轮廓；输入主体、附加段
  统一 26px，左右图标统一 14px。纯图标附加段使用 32px，文字/单位/按钮保持内容宽度。
  不允许业务页分别给 `.el-input__inner` 与 `.el-input-group__append` 写不同高度。
- 登录页和显式定制页继续使用自身样式，不套用上述高权重规则。

---

## 表单列数与输入宽度 【中危】

- 全宽业务表单默认 4 列，严禁使用 5～8 列把输入框压缩到无法阅读或填写。
- 单个控件可输入区不足 160px 时降为 3 列；长标签、带单位字段按同样标准判断。
- 字段较多时使用分区、Tab 或展开/收起，首屏建议展示 4～6 行。
- 不依赖步进操作的数字输入传入 `controls=false`，不得用 CSS 强行覆盖出第二层焦点边框。

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
