import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:8083",
    viewport: { width: 390, height: 844 },
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx expo start --web --port 8083 --max-workers 2",
    url: "http://localhost:8083",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
