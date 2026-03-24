import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/._*"],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    headless: false, // Opens real browser window
    viewport: { width: 430, height: 932 }, // iPhone 15 Pro Max
    screenshot: "on",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
