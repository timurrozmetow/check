import { expect, test } from "@playwright/test";

/**
 * Smoke-тест ПРОД-СБОРКИ (dist через `vite preview`), а НЕ dev-сервера.
 * Именно в прод-сборке работают бандлинг и code-split (manualChunks), поэтому
 * только так ловятся поломки, которые dev-режим пропускает: циклические чанки,
 * TDZ «Cannot access 'x' before initialization», битый ленивый импорт.
 *
 * Бэкенд не нужен: страница входа рендерится и без API (первичный tryRefresh
 * падает по сети, приложение инициализируется и уходит на /login). Нам важен
 * сам факт, что бандл инициализировался и React смонтировался.
 */
test.beforeEach(async ({ page }) => {
  // Фиксируем RU, чтобы детерминированно искать кнопку «Войти».
  await page.addInitScript(() => localStorage.setItem("lang", "ru"));
});

test("прод-сборка инициализируется без ошибок рантайма", async ({ page }) => {
  const pageErrors: string[] = [];
  // pageerror = НЕОБРАБОТАННОЕ исключение (в т.ч. TDZ из циклического чанка).
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto("/login");

  // Кнопка «Войти» видима ⇒ React смонтировался ⇒ бандл жив.
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();

  expect(
    pageErrors,
    `Необработанные ошибки рантайма (вероятен битый бандл / циклический чанк):\n${pageErrors.join("\n")}`,
  ).toEqual([]);
});
