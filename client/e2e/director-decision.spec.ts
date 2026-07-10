import { expect, test } from "@playwright/test";

/**
 * Флагманский сценарий: директор видит запрос решения и открывает раздел решений.
 * Требует свежий seed (запрос «Выбор кофемашины» в статусе pending).
 */
test("директор видит блок «Ждут вашего решения»", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("director@directorhub.ru");
  await page.getByLabel("Пароль", { exact: true }).fill("director12345");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/director$/);

  // Блок решений или пустое состояние — в любом случае раздел доступен
  await page.getByRole("link", { name: /Ждут решения/ }).click();
  await expect(page).toHaveURL(/\/director\/decisions$/);
  await expect(
    page.getByRole("tab", { name: /Ждут решения/ }),
  ).toBeVisible();
});
