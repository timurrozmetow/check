import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke-конфиг: тестируем ПРОД-СБОРКУ (dist через `vite preview`), а не dev-сервер.
 * Playwright сам поднимает preview на :4173, гоняет только smoke.spec.ts и гасит
 * сервер. Ни API, ни БД не нужны — проверяем, что бандл инициализируется
 * (ловит circular chunk / TDZ, которые обычные e2e на dev-режиме не видят).
 *
 * Требует предварительного `vite build` (preview отдаёт готовый dist).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Локально — установленный Edge; в CI — bundled Chromium.
        ...(process.env.CI ? {} : { channel: "msedge" }),
      },
    },
  ],
});
