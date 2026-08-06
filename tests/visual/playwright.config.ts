import { defineConfig, devices } from "@playwright/test";

const browserChannel =
  process.env.WL_UI_BROWSER_CHANNEL ||
  (process.platform === "win32" ? "msedge" : undefined);

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
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
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
