/** scanner/rules/button.mjs — 按钮规则：R004 R005 R015 R038 R041 */
import { lineOf, issue, findTags, hasTrueBooleanAttr } from "./_shared.mjs";

export const CREATE_ACTION_LABEL = /(?:新增|新建|添加|创建)(?:申请|记录|数据|客户|项目|任务|明细|行)?/;
export const STATIC_BUTTON_ICON_BY_LABEL = [
  [/(新增|新建|添加|创建)/, "Plus"],
  [/(编辑|修改)/, "Edit"],
  [/(删除|移除|作废)/, "Delete"],
  [/(搜索|查询|检索)/, "Search"],
  [/(重置|刷新|同步|重新加载)/, "Refresh"],
  [/(导出|下载)/, "Download"],
  [/(导入|上传)/, "Upload"],
  [/(查看|详情|预览)/, "View"],
  [/(保存|确认|确定|提交|通过|审核)/, "Check"],
  [/(取消|关闭|清空)/, "Close"],
  [/(返回|上一步)/, "Back"],
  [/(打印)/, "Printer"],
  [/(复制)/, "CopyDocument"],
];

function buttonContent(template, tag) {
  const start = tag.index + tag.text.length;
  const tagName = tag.text.match(/^<([A-Za-z][\w-]*)/)?.[1] || "el-button";
  const end = template.indexOf(`</${tagName}>`, start);
  return end < 0 ? "" : template.slice(start, end);
}

export const buttonRules = [
  // R004: 操作列文字按钮
  {
    id: "R004",
    category: "button",
    severity: "error",
    name: "操作列使用旧格式文字按钮而非 renderOps 图标系统",
    check(template, file, lineOffset) {
      const issues = [];
      const btnPattern =
        /<el-button\b(?![^>]*jh-op-btn)[^>]*@click="handle(?:Edit|Delete|View|Remove|Cancel|Audit|Verify)[^"]*"[^>]*>[^<]*<\/el-button>/g;
      let m;
      while ((m = btnPattern.exec(template)) !== null)
        issues.push(
          issue(
            file,
            lineOf(template, m.index, lineOffset),
            "R004",
            "button",
            "error",
            "操作列使用文字 el-button，应改为 renderOps 图标按钮系统",
            'defaultSlot: ({ row }) => renderOps([{ type: "edit", onClick: () => ... }])',
          ),
        );
      return issues;
    },
  },

  // R005: 普通动作按钮缺少 icon
  {
    id: "R005",
    category: "button",
    severity: "warning",
    name: "普通动作按钮缺少 icon",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-button", "ElButton"]) {
        for (const tag of findTags(template, tagName)) {
          if (/jh-op-btn/.test(tag.text)) continue;
          if (
            hasTrueBooleanAttr(tag.text, "link") ||
            hasTrueBooleanAttr(tag.text, "text")
          ) {
            continue;
          }
          const content = buttonContent(template, tag);
          if (/:?icon\s*=/.test(tag.text) || /<el-icon\b/.test(content)) continue;
          const staticLabel = content.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
          if (STATIC_BUTTON_ICON_BY_LABEL.some(([pattern]) => pattern.test(staticLabel))) {
            continue;
          }
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R005",
              "button",
              "warning",
              `${tagName} 缺少语义 icon`,
              '按动作补 icon="Plus / Edit / Search / Refresh / Check / Close" 等语义图标',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R043: 静态常见动作按钮可按确定性文案表补 icon
  {
    id: "R043",
    category: "button",
    severity: "warning",
    name: "静态常见动作按钮缺少可确定映射的语义 icon",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-button", "ElButton"]) {
        for (const tag of findTags(template, tagName)) {
          if (/jh-op-btn/.test(tag.text)) continue;
          if (
            hasTrueBooleanAttr(tag.text, "link") ||
            hasTrueBooleanAttr(tag.text, "text") ||
            /:?icon\s*=/.test(tag.text)
          ) {
            continue;
          }
          const content = buttonContent(template, tag);
          if (/<el-icon\b/.test(content)) continue;
          const label = content.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
          const icon = STATIC_BUTTON_ICON_BY_LABEL.find(([pattern]) =>
            pattern.test(label),
          )?.[1];
          if (!icon) continue;
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R043",
              "button",
              "warning",
              `${tagName} 静态动作“${label}”缺少语义 icon`,
              `按确定性映射补 icon="${icon}"`,
            ),
          );
        }
      }
      return issues;
    },
  },

  // R038: 新增/新建/添加/创建类主操作必须使用填充主题色
  {
    id: "R038",
    category: "button",
    severity: "error",
    name: "创建类主操作缺少 primary 填充主题色",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-button")) {
        const label = buttonContent(template, tag);
        if (!CREATE_ACTION_LABEL.test(label)) continue;
        if (/:type\s*=/.test(tag.text)) continue;
        if (
          hasTrueBooleanAttr(tag.text, "link") ||
          hasTrueBooleanAttr(tag.text, "text")
        ) {
          continue;
        }
        const isPrimary = /(?:^|\s)type\s*=\s*["']primary["']/.test(
          tag.text,
        );
        const isPlain = hasTrueBooleanAttr(tag.text, "plain");
        if (!isPrimary || isPlain) {
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R038",
              "button",
              "error",
              "新增/新建/添加/创建类主操作必须是 primary 填充按钮",
              '设置 type="primary" 并移除 plain；行内次级操作应显式使用 link/text',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R041：按钮尺寸必须显式声明；fixer 只补缺失的 small，不覆盖业务显式尺寸。
  {
    id: "R041",
    category: "button",
    severity: "warning",
    name: "按钮与 BaseToolbar 必须显式声明 size，默认使用 small",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-button", "ElButton", "base-toolbar", "BaseToolbar"]) {
        for (const tag of findTags(template, tagName)) {
          if (/(?:^|\s)(?:size|:size|v-bind:size)\s*=/.test(tag.text)) continue;
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R041",
              "button",
              "warning",
              `${tagName} 未显式声明 size，可能因本地与线上 ConfigProvider 默认值不同而产生尺寸漂移`,
              '默认补 size="small"；业务明确需要 default/large 或动态尺寸时保留其显式配置',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R015: 弹窗嵌套表格操作列用 el-button link
  {
    id: "R015",
    category: "button",
    severity: "error",
    name: "弹窗嵌套表格操作列使用文字 el-button（应改为 jh-op-btn 图标按钮）",
    check(template, file, lineOffset) {
      const issues = [];
      if (!file.endsWith("modal.vue")) return issues;
      const pattern = /<el-button[\s\S]*?link[\s\S]*?<\/el-button>/g;
      let m;
      while ((m = pattern.exec(template)) !== null) {
        const btnText = m[0];
        if (/取消|确认|确定|关闭|保存|提交/.test(btnText)) continue;
        if (
          !/<el-table-column/.test(
            template.slice(Math.max(0, m.index - 500), m.index),
          )
        )
          continue;
        issues.push(
          issue(
            file,
            lineOf(template, m.index, lineOffset),
            "R015",
            "button",
            "error",
            "弹窗嵌套表格操作列使用 el-button link，风格不统一",
            '改为 <button class="jh-op-btn jh-op-del/view/edit"> + <el-icon>图标</el-icon>',
          ),
        );
      }
      return issues;
    },
  },

  // R013: columnsDef 旧 operations:[] 文字按钮配置
  {
    id: "R013",
    category: "button",
    severity: "error",
    name: "columnsDef 使用旧 operations:[] 文字按钮",
    checkScript(script, file, lineOffset) {
      const issues = [];
      const lines = script.split("\n");
      lines.forEach((line, index) => {
        if (!/^\s*operations:\s*\[/.test(line) || line.trim().startsWith("//")) {
          return;
        }
        issues.push(
          issue(
            file,
            lineOffset + index + 1,
            "R013",
            "button",
            "error",
            "columnsDef 使用旧格式 operations: [...] 文字按钮",
            "改为 defaultSlot: ({ row }) => renderOps([...]) 图标按钮系统",
          ),
        );
      });
      return issues;
    },
  },
];
