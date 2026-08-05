import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("复合多标签输入样式契约", () => {
  const form = read("styles/element/_form.scss");
  const jhUi = read("styles/vendors/_jh-ui.scss");
  const baseComponents = read("styles/vendors/_base-components.scss");
  const vendorIndex = read("styles/vendors/index.scss");

  it("能区分复合外壳、内部编辑器和普通输入框", () => {
    const window = new Window();
    const { document } = window;

    document.body.innerHTML = `
      <div class="com-userPicker">
        <div class="user-picker-input">
          <div id="outer" class="com-input-multi-tag-wrap el-input el-input__wrapper">
            <div class="com-input-multi-tag">
              <div id="editor" class="el-input">
                <div id="inner" class="el-input__wrapper"><input /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="el-input"><div id="normal" class="el-input__wrapper"><input /></div></div>
    `;

    const outer = document.querySelector("#outer");
    const editor = document.querySelector("#editor");
    const inner = document.querySelector("#inner");
    const normal = document.querySelector("#normal");

    assert.equal(
      outer.matches(".el-input__wrapper:not(.com-input-multi-tag-wrap)"),
      false,
    );
    assert.equal(
      normal.matches(".el-input__wrapper:not(.com-input-multi-tag-wrap)"),
      true,
    );
    assert.equal(
      outer.matches(".com-userPicker .el-input:not(.com-input-multi-tag-wrap)"),
      false,
    );
    assert.equal(
      editor.matches(".com-userPicker .el-input:not(.com-input-multi-tag-wrap)"),
      true,
    );
    assert.equal(
      outer.matches(".com-input-multi-tag-wrap .el-input__wrapper"),
      false,
    );
    assert.equal(
      inner.matches(".com-input-multi-tag-wrap .el-input__wrapper"),
      true,
    );

    window.close();
  });

  it("外壳自然增高但仍保持统一高度下限、圆角和状态边框", () => {
    assert.match(
      form,
      /&\.el-input__wrapper:not\(\.com-input-multi-tag-wrap\),[\s\S]*?height:\s*var\(--wk-form-control-height\)\s*!important/,
    );
    assert.match(
      jhUi,
      /&\.com-input-multi-tag-wrap\.el-input__wrapper\s*\{[\s\S]*?height:\s*auto\s*!important;[\s\S]*?min-height:\s*var\(--wk-form-control-height,\s*26px\)\s*!important;[\s\S]*?border-radius:\s*var\(--wk-form-control-radius,[\s\S]*?box-shadow:/,
    );
    assert.match(
      jhUi,
      /\.com-input-multi-tag-wrap\.el-input__wrapper:not\(\.is-disabled\):hover/,
    );
    assert.match(
      jhUi,
      /\.com-input-multi-tag-wrap\.el-input__wrapper\.is-disabled\s*\{[\s\S]*?--el-disabled-border-color/,
    );
  });

  it("焦点和错误态只由复合外壳绘制，不给内部输入增加第二层边框", () => {
    const innerWrapperGuard =
      ":not(.com-input-multi-tag-wrap .el-input__wrapper)";

    assert.ok(
      baseComponents.includes(`&.el-input__wrapper${innerWrapperGuard}:focus-within`),
    );
    assert.ok(
      baseComponents.includes(`.el-input__wrapper${innerWrapperGuard},`),
    );
    assert.match(
      baseComponents,
      /box-shadow:\s*0 0 0 1\.5px var\(--el-color-primary,\s*#002a8f\) inset !important/,
    );
    assert.match(
      baseComponents,
      /box-shadow:\s*0 0 0 1px var\(--el-color-danger,\s*#f56c6c\) inset !important/,
    );
    assert.ok(
      vendorIndex.indexOf("@forward './_jh-ui'") <
        vendorIndex.indexOf("@forward './_base-components'"),
      "统一 focus/error 状态层必须在 jh 复合控件基础适配之后加载",
    );
  });
});
