import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateReport } from "../report.mjs";

describe("compact scan report", () => {
  it("按文件压缩重复字段，同时保留修复所需信息", () => {
    const compact = JSON.parse(
      generateReport(
        [
          {
            file: "views/List.vue",
            line: 12,
            rule: "R001",
            severity: "error",
            description: "缺少居中",
            suggestion: '添加 align="center"',
          },
          {
            file: "views/List.vue",
            line: 20,
            rule: "R041",
            severity: "warning",
            description: "缺少 small",
            suggestion: '添加 size="small"',
          },
        ],
        3,
        "compact",
        {
          coverage: {
            element: ["el-table"],
            recommendedSkills: ["element/el-table"],
          },
          recommendations: {
            recommendedFlows: ["legacy-skin-align"],
            nextActions: ["先 dry-run"],
          },
        },
      ),
    );
    assert.equal(compact.schema, "wl-ui-scan.compact.v1");
    assert.deepEqual(compact.summary, {
      files: 3,
      total: 2,
      error: 1,
      warning: 1,
      info: 0,
      suggestion: 0,
      review: 0,
    });
    assert.equal(compact.issuesByFile["views/List.vue"].length, 2);
    assert.deepEqual(compact.issuesByFile["views/List.vue"][0], [
      12,
      "R001",
      "error",
      "缺少居中",
      '添加 align="center"',
    ]);
    assert.deepEqual(compact.skills, ["element/el-table"]);
  });

  it("compact-v2 去重规则字段并支持稳定分页", () => {
    const issues = [
      {
        file: "A.vue",
        line: 1,
        rule: "R001",
        severity: "error",
        category: "table",
        description: "first",
        suggestion: "align center",
      },
      {
        file: "A.vue",
        line: 2,
        rule: "R001",
        severity: "error",
        category: "table",
        description: "second",
        suggestion: "align center",
      },
    ];
    const first = JSON.parse(
      generateReport(issues, 1, "compact-v2", { limit: 1, cursor: 0 }),
    );
    assert.equal(first.schema, "wl-ui-scan.compact.v2");
    assert.deepEqual(first.ruleCatalog.R001, ["error", "align center", "table"]);
    assert.equal(first.issuesByFile["A.vue"].length, 1);
    assert.equal(first.page.nextCursor, "1");

    const second = JSON.parse(
      generateReport(issues, 1, "compact-v2", { limit: 1, cursor: 1 }),
    );
    assert.equal(second.issuesByFile["A.vue"][0][2], "second");
    assert.equal(second.page.nextCursor, null);
  });

  it("summary 不输出逐条 issue 明细", () => {
    const output = generateReport(
      [
        {
          file: "A.vue",
          line: 1,
          rule: "R001",
          severity: "error",
          category: "table",
          description: "detail must not be repeated",
        },
      ],
      1,
      "summary",
    );
    const parsed = JSON.parse(output);
    assert.equal(parsed.schema, "wl-ui-scan.summary.v1");
    assert.equal(parsed.summary.byRule.R001, 1);
    assert.doesNotMatch(output, /detail must not be repeated/);
  });

  it("Markdown 规则标题直接读取 standards/rules.json 事实源", () => {
    const markdown = generateReport(
      [
        {
          file: "views/Form.vue",
          line: 8,
          rule: "R042",
          category: "form",
          severity: "error",
          description: "日期弹层污染",
          suggestion: "限定 popper",
        },
      ],
      1,
      "markdown",
    );
    assert.match(markdown, /禁止用裸 \.el-date-picker 几何样式设置输入宽度/);
  });
});
