import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Testerna behöver DATABASE_URL och AUTH_SECRET, både för appen och för
// hjälparna i e2e/. I CI sätts de som miljövariabler.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Auth.js litar bara automatiskt på värden i dev och på Vercel.
    env: { AUTH_TRUST_HOST: "true" },
  },
});
