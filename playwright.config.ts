import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./output/qa/playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4201",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: [
    {
      command: "pnpm --filter @faenalert/api start",
      url: "http://127.0.0.1:3010/api/v1/health/ready",
      name: "FAENALERT API",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        PORT: "3010",
        HOST: "127.0.0.1",
        CORS_ORIGIN: "http://127.0.0.1:4201",
        NODE_ENV: "test",
        LOCAL_AUTH_ENABLED: "true",
      },
    },
    {
      command: "pnpm --filter faenalert-frontend start:e2e",
      url: "http://127.0.0.1:4201",
      name: "FAENALERT web",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
