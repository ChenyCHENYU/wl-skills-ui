# 规范 06：存量改造踩坑沉淀（Legacy Migration Lessons）

> 来源：wl-ui-ep（危废/环保子系统）存量改造实战验证，2026-08。
> 每条都经历过"线上翻车 → 定位 → 修复 → 验证"闭环，新项目直接受益，不再重踩。

---

## 1. AG Grid 二级（分组）表头不渲染

**症状**：列定义带 `children` 的分组列，渲染出来"扁平成一级"，分组行消失。

**根因**：全局样式对 `.ag-header-row` 强制了 `height: auto !important`（或任意强制行高）。
ag-grid 内部按变量计算分组行高与各行 `top` 定位，强制 height 让分组行高度算成 0。

**正确姿势**（已固化到 `vendors/_ag-grid.scss`）：

```scss
// 变量驱动，行高交给 ag-grid
.ag-root-wrapper {
  --ag-header-height: 36px;
  --ag-group-header-height: 36px;
}
// 分组兜底：真实存在分组行时强制两行各 36px（:has 只在分组时命中）
.ag-header:has(.ag-header-row-column-group) { /* height: 2×36 */ }
```

**守门**：`npm run check:scss` 含反模式扫描，包内出现 `.ag-header-row` 强制 height 直接报错。

---

## 2. 滚动条悬停不显示 / 灰色不主题色

**症状**：容器 hover 时滚动条不出现；或滚动条是灰的、与品牌色无关。

**根因**：
- 「容器:hover 直选 `::-webkit-scrollbar-thumb`」在部分 Chromium 版本**不触发滚动条重绘**；
- 灰色系配色没接品牌 token。

**正确姿势**（已固化，双轨）：

```scss
// a) Chrome 121+ / Firefox：标准属性，容器 hover 换值必定生效
.box { scrollbar-width: thin; scrollbar-color: transparent transparent; }
.box:hover { scrollbar-color: var(--el-color-primary) transparent; }
// b) 旧 Chromium：webkit 伪元素 + CSS 变量继承（继承链更新可靠触发重绘）
.box { --wk-sb-thumb: transparent; }
.box:hover { --wk-sb-thumb: var(--el-color-primary); }
.box::-webkit-scrollbar-thumb { background-color: var(--wk-sb-thumb); }
```

交互标准：**默认隐藏 → 悬停容器显示主题色（单档）→ 离开即隐藏**。不做深浅两档。

---

## 3. 表头/内容默认居中，属性可退出

**约定**：列定义不写 `align` 时默认表头+内容居中；显式声明 `align: "left"` 等以列为准。

**固化**：`runtime` 的 `normalizeColumnAlignmentsWith(cols, { defaultAlign: "center" })`：
无显式 align/cellStyle/headerClass 的列补齐默认居中（含表头 class 桥接，兼容共享
AG 适配层只认 class 的场景），递归分组 children；存量项目保持
`normalizeColumnAlignments(cols)` 不传 options 即不补齐，向后兼容。

---

## 4. 状态列 Tag：文案语义自动判色

**场景**：存量项目几十个列表页、上百个字典列，逐字段配颜色表不现实。

**固化**：`renderAutoTag(value, dictKey, fieldName?)` / `renderAutoTagByLabel(label, fieldName?)`
按字典渲染出的**文案关键词**判色，零配色表：

| 文案关键词 | 效果 |
|---|---|
| 驳回/停用/作废/超标/逾期/异常… | 实心 danger |
| 已完成/正常/合格/已审批/启用… | 实心 success |
| 待/进行中/审批中/整改中/预警… | 实心 warning |
| 新建/草稿/未开始/历史… | 实心 info |
| XX类型/形态（气态/液态/固态…） | 镂空 Tag（视觉权重低于状态） |
| 单位/职务/周期等中性词 | **原样纯文本**（零视觉变化兜底） |

规则表 `AUTO_STATUS_RULES` / `AUTO_CLASSIFY_RULES` 已导出，可按项目扩展。

---

## 5. 操作列图标：默认统一浅主题蓝，悬停出语义色

**定案**：查看/编辑/删除图标**默认一律浅主题蓝**（整列安静不花哨），**悬停**才显示
各自语义色——查看蓝、编辑黄、删除红。三类图标静态各涂一色被业务明确否决（太花）。

编辑 hover 用警示黄而非绿：与查看蓝/删除红拉开三色区分，绿留给成功/审核语义。
（已固化到 `vendors/_base-components.scss` 的 `jh-op-*`。）

---

## 6. 禁用按钮可辨识

**坑**：「语义按钮统一白字」规则若不带 `:not(.is-disabled)`，禁用态白字叠灰底文字消失。

**正确姿势**：白字规则排除 `.is-disabled`；禁用态用**语义淡色**——语义 light-8 浅底 +
light-5 文字（各语义色按钮禁用后仍可辨识"这是哪类按钮"）。已固化到 `element/_button.scss`。

---

## 7. 搜索区间距标准

| 位置 | 标准值 |
|---|---|
| 搜索项之间（横向） | 16px |
| 搜索区容器左右 padding | 12px |
| label ↔ 控件 | 10px |
| 行间（纵向） | 6px |

（`vendors/_base-query-toolbar.scss` 已按此标准实现。）

---

## 8. 分页器位置

表格**右侧下方**：`.list-page__pager { display:flex; justify-content:flex-end }`
（`layouts/_list-page.scss` 已固化）。不允许分页器贴着表格左缘或顶在表格正下方左侧。

---

## 9. 样式污染规避（联邦门户共存场景）

**教训**（多子系统经门户联邦挂载、共享同一 document）：

1. **`:root` / `body` / `#app` 是全体共享锚点**——在多子系统门户里 `#app` 是门户的容器，
   不是自己子系统的。写在这三类锚点上的规则等于泼向所有子系统。
2. **token 互相剥除**：两个子系统都往 `:root body` 写 `--el-color-*` 且带 `!important`
   时，后加载者胜——先进入的子系统皮肤被剥（真实事故：删除按钮红底被剥成白字白底）。
3. **防外溢固化**：怕被外来样式污染的自身组件，锚定**项目独有类名** + `!important`
   （如 divider 间距、图标字号），别人命中不了、自己稳定。

**正确姿势**：规则尽量落在**项目/组件独有类**或本包 `managed-scope`（含
`data-wl-ui-skin="off"` 豁免）内；需要全局 token 时只写一遍且接受统一皮肤源。

---

## 10. 字典列扫描审计机制

存量项目"哪些列该上 Tag 而没上"靠肉眼不可维护。配套审计脚本思路（wl-skills-kit
提供 `audit-status-columns.mjs`）：

- 扫描列定义中 `formatter: (row) => xDict.fmt(row.field)` 写法；
- 按列 label 语义分级：状态/类型类 → 建议转 `renderAutoTag`；中性（单位/职务）→ 保持；
- `--fix` 自动转换 + 补 import + 清理无引用 formatter；转换的 dict/字段取自 const 定义
  （无歧义源），最坏情况走中性纯文本兜底，零风险。
