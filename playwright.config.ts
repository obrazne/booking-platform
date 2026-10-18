import { defineConfig, devices } from "@playwright/test";

// Browser tests of the MVP (Z16). They run locally against a server connected to the STAGING database
// (`npm run build && npm start -- -p 3100`) and create test data with e-mails on the reserved domain
// booking-platform.test (never sent) — removed again after the run. Never point them at production.
try {
  process.loadEnvFile(".env.local");
} catch {}

export const GUEST_URL = process.env.E2E_GUEST_URL ?? "http://ukazka.localhost:3100";
export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  globalTeardown: "./e2e/teardown.ts",
  use: { locale: "sk-SK", timezoneId: "Europe/Bratislava", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile",
      testMatch:
<<<<<<< Updated upstream
        /(guest|a11y|confirm|tour|admin-v1|admin-v12|cart|platform-v12|upsell-guest|checkin-guest|stay-states|account-v24|messages-guest|ui-rules)\.spec/,
=======
        /(guest|a11y|confirm|tour|admin-v1|admin-v12|cart|platform-v12|upsell-guest|checkin-guest|stay-states|account-v24|messages-guest|account-nav)\.spec/,
>>>>>>> Stashed changes
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
