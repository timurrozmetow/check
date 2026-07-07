import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-тесты предполагают запущенное приложение на http://localhost:5173
 * (npm run dev из корня) и применённый seed. Используем установленный Edge,
 * чтобы не качать Chromium.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Локально используем установленный Edge; в CI — bundled Chromium
        ...(process.env.CI ? {} : { channel: "msedge" }),
      },
    },
  ],
});
