import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./platform-base-fixture.scss";
import "../../../styles/presets/skin.scss";
import "../../../runtime/auto";
import VisualHarness from "./VisualHarness.vue";
import "./visual-harness.scss";

createApp(VisualHarness).use(ElementPlus).mount("#app");
