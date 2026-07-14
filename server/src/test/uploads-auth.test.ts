import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "./reset";
import { createUser } from "../modules/users/service";
import { buildApp } from "../app";

/** Аудит #6: статика /uploads доступна только при валидной cookie-сессии. */
describe("авторизация статики /uploads", () => {
  beforeEach(resetDb);

  it("без cookie — 403, с валидной up_token — гард пропускает", async () => {
    await createUser({
      name: "A",
      email: "a@t.ru",
      password: "password123",
      role: "admin",
    });

    const app = await buildApp();
    await app.ready();

    // Без cookie — доступ запрещён
    const noAuth = await app.inject({ method: "GET", url: "/uploads/nope.png" });
    expect(noAuth.statusCode).toBe(403);

    // Логинимся → получаем up_token cookie
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "a@t.ru", password: "password123" },
    });
    const up = login.cookies.find((c) => c.name === "up_token");
    expect(up).toBeTruthy();

    // С валидным up_token гард пропускает → static отдаёт 404 (файла нет), НЕ 403
    const withAuth = await app.inject({
      method: "GET",
      url: "/uploads/nope.png",
      cookies: { up_token: up!.value },
    });
    expect(withAuth.statusCode).not.toBe(403);

    // Битый токен — снова 403
    const badToken = await app.inject({
      method: "GET",
      url: "/uploads/nope.png",
      cookies: { up_token: "garbage.token.value" },
    });
    expect(badToken.statusCode).toBe(403);

    await app.close();
  });
});
