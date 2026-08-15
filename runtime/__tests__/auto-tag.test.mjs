import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  autoTagTypeByLabel,
  renderAutoTag,
  renderAutoTagByLabel,
  setDictResolver,
  AUTO_STATUS_RULES,
  AUTO_CLASSIFY_RULES,
} from "../../runtime/core/renderers.ts";

const isVNode = (v) => typeof v === "object" && v !== null && "__v_isVNode" in v;

describe("autoTagTypeByLabel 文案语义判色", () => {
  it("负向状态词 → 实心 danger", () => {
    for (const label of ["已驳回", "停用", "已作废", "超标", "逾期", "不合格"]) {
      assert.deepEqual(autoTagTypeByLabel(label), { type: "danger", plain: false }, label);
    }
  });

  it("正向终态词 → 实心 success", () => {
    for (const label of ["已完成", "正常", "已审批", "合格", "启用", "已处置"]) {
      assert.deepEqual(autoTagTypeByLabel(label), { type: "success", plain: false }, label);
    }
  });

  it("中间态词 → 实心 warning（优先级低于 danger/success）", () => {
    for (const label of ["待处理", "审批中", "整改中", "预警"]) {
      assert.deepEqual(autoTagTypeByLabel(label), { type: "warning", plain: false }, label);
    }
  });

  it("初始态词 → 实心 info", () => {
    for (const label of ["新建", "草稿", "未开始", "历史"]) {
      assert.deepEqual(autoTagTypeByLabel(label), { type: "info", plain: false }, label);
    }
  });

  it("危险词优先于成功词（驳回已完成 → danger）", () => {
    assert.equal(autoTagTypeByLabel("驳回已完成")?.type, "danger");
  });

  it("分类/形态词 → 镂空 Tag", () => {
    assert.deepEqual(autoTagTypeByLabel("气态"), { type: "danger", plain: true });
    assert.deepEqual(autoTagTypeByLabel("液态"), { type: "info", plain: true });
    const tag = autoTagTypeByLabel("废物类型A");
    assert.equal(tag?.plain, true);
  });

  it("fieldName 英文语义也参与分类判定", () => {
    const tag = autoTagTypeByLabel("某文案", "wasteType");
    assert.notEqual(tag, null);
  });

  it("中性文案 → null（保持纯文本兜底）", () => {
    for (const label of ["千克", "吨", "部门经理", "每月", "张三丰"]) {
      assert.equal(autoTagTypeByLabel(label, "measureUnit"), null, label);
    }
  });

  it("规则表已导出且可扩展", () => {
    assert.ok(Array.isArray(AUTO_STATUS_RULES) && AUTO_STATUS_RULES.length >= 4);
    assert.ok(Array.isArray(AUTO_CLASSIFY_RULES) && AUTO_CLASSIFY_RULES.length >= 4);
    for (const [re] of AUTO_STATUS_RULES) assert.ok(re instanceof RegExp);
  });

  it("单字词锚定：业务文案不被误判（招待费/无票运输/未税 → 纯文本）", () => {
    assert.equal(autoTagTypeByLabel("招待费", "fee"), null);
    assert.equal(autoTagTypeByLabel("无票运输", "transport"), null);
    assert.equal(autoTagTypeByLabel("未税", "price"), null);
    assert.equal(autoTagTypeByLabel("接待", "reception"), null);
  });

  it("单字词整词命中：待/无/否/未 独立成词时仍判色", () => {
    assert.deepEqual(autoTagTypeByLabel("待", "status"), { type: "warning", plain: false });
    assert.deepEqual(autoTagTypeByLabel("否", "yesNo"), { type: "info", plain: false });
    assert.deepEqual(autoTagTypeByLabel("无", "yesNo"), { type: "info", plain: false });
  });

  it("「未X」先行拦截：不被 success 组子串反向误命中", () => {
    assert.deepEqual(autoTagTypeByLabel("未完成", "status"), { type: "info", plain: false });
    assert.deepEqual(autoTagTypeByLabel("未通过", "status"), { type: "danger", plain: false });
    assert.deepEqual(autoTagTypeByLabel("未启用", "status"), { type: "info", plain: false });
    assert.deepEqual(autoTagTypeByLabel("审核通过", "status"), { type: "success", plain: false });
  });
});

describe("renderAutoTagByLabel 渲染", () => {
  it("状态词渲染为实心 Tag VNode", () => {
    const node = renderAutoTagByLabel("已完成", "status");
    assert.ok(isVNode(node));
    assert.equal(node.props?.effect ?? "light", "light");
  });

  it("分类词渲染为镂空 Tag VNode", () => {
    const node = renderAutoTagByLabel("气态", "wasteForm");
    assert.ok(isVNode(node));
    assert.equal(node.props?.effect, "plain");
  });

  it("中性文案原样返回字符串（defaultSlot 直接可用）", () => {
    assert.equal(renderAutoTagByLabel("千克", "measureUnit"), "千克");
  });
});

describe("renderAutoTag 字典版", () => {
  beforeEach(() => {
    // 运行时置空 resolver（TS 签名要求函数，运行时实现接受 null）
    setDictResolver(null);
  });

  it("空值返回 null", () => {
    assert.equal(renderAutoTag(null, "x"), null);
    assert.equal(renderAutoTag(undefined, "x"), null);
    assert.equal(renderAutoTag("", "x"), null);
  });

  it("未注入 resolver 时按 value 原文判色", () => {
    const node = renderAutoTag("已完成", "status");
    assert.ok(isVNode(node));
  });

  it("注入 resolver 后按解析文案判色", () => {
    setDictResolver((_key, value) => (value === "1" ? "已驳回" : "正常"));
    const rejected = renderAutoTag("1", "approvalStatus");
    assert.ok(isVNode(rejected));
    assert.equal(rejected.props?.type, "danger");
    const normal = renderAutoTag("2", "approvalStatus");
    assert.equal(normal.props?.type, "success");
  });

  it("resolver 解析出中性文案时保持纯文本", () => {
    setDictResolver(() => "每月");
    assert.equal(renderAutoTag("3", "cycle"), "每月");
  });
});
