import { defineConfig, devices } from "@playwright/test";

const visualBrowserChannel =
  process.env.WL_UI_BROWSER_CHANNEL ||
  (process.platform === "win32" ? "msedge" : undefined);
const edgeChannel = process.platform === "win32" ? "msedge" : undefined;
const chromeChannel = process.platform === "win32" ? "chrome" : undefined;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4178",
    colorScheme: "light",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 1000 },
  },
  projects: [
    {
      name: "enterprise-chromium",
      testIgnore: "**/browser-compat.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ...(visualBrowserChannel ? { channel: visualBrowserChannel } : {}),
      },
    },
    {
      name: "enterprise-edge-contract",
      testMatch: "**/browser-compat.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ...(edgeChannel ? { channel: edgeChannel } : {}),
      },
    },
    {
      name: "enterprise-chrome-contract",
      testMatch: "**/browser-compat.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromeChannel ? { channel: chromeChannel } : {}),
      },
    },
  ],
  webServer: {
    command: "pnpm exec vite --config vite.config.ts",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
