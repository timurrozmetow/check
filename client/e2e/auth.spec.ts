import { expect, test } from "@playwright/test";

async function login(page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  // exact: иначе матчится и кнопка-переключатель «Показать пароль».
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

test("директор входит и попадает на свой дашборд", async ({ page }) => {
  await login(page, "director@directorhub.ru", "director12345");
  await expect(page).toHaveURL(/\/director$/);
  // Шапка показывает раздел текущего маршрута («Дашборд»).
  await expect(page.getByRole("heading", { name: "Дашборд" })).toBeVisible();
  // Раздел «Ждут решения» доступен в навигации.
  await expect(page.getByText("Ждут решения").first()).toBeVisible();
});

test("сотрудник видит только свои задачи и не видит админ-разделы", async ({
  page,
}) => {
  await login(page, "ivan@directorhub.ru", "employee12345");
  await expect(page).toHaveURL(/\/employee$/);
  await expect(
    page.getByRole("heading", { name: "Мои задачи" }).first(),
  ).toBeVisible();
  // В навигации нет раздела «Модерация» (только для админа)
  await expect(page.getByRole("link", { name: "Модерация" })).toHaveCount(0);
});

test("неверный пароль показывает ошибку", async ({ page }) => {
  await login(page, "director@directorhub.ru", "wrongpassword");
  await expect(page.getByText(/Неверный email или пароль/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("гость перенаправляется на страницу входа", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});
