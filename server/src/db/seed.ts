import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { users } from "./schema";

/**
 * Создаёт единственную учётную запись администратора.
 * Остальных пользователей, проекты и задачи админ заводит сам из интерфейса.
 */
async function main() {
  // В проде задаём через env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).
  const email = process.env.ADMIN_EMAIL ?? "admin@directorhub.ru";
  const name = process.env.ADMIN_NAME ?? "Администратор";

  // В production запрещаем дефолтный пароль: иначе публично известный
  // 'admin12345' уходит в прод и печатается в логах. Требуем надёжный env.
  const isProd = process.env.NODE_ENV === "production";
  const envPassword = process.env.ADMIN_PASSWORD;
  if (isProd && (!envPassword || envPassword.length < 8)) {
    console.error(
      "ADMIN_PASSWORD не задан или короче 8 символов. В production сид без " +
        "надёжного пароля запрещён — укажите ADMIN_PASSWORD в server/.env.",
    );
    await pool.end();
    process.exit(1);
  }
  const password = envPassword ?? "admin12345";

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingAdmin) {
    console.log("Администратор уже существует — пропускаю.");
    await pool.end();
    return;
  }

  const passwordHash = await argon2.hash(password);
  await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: "admin",
  });

  console.log("Готово. Учётная запись администратора:");
  console.log(`  Email:  ${email}`);
  console.log(
    process.env.ADMIN_PASSWORD
      ? "  Пароль: (из ADMIN_PASSWORD)"
      : "  Пароль: admin12345 (СМЕНИТЕ!)",
  );
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка seed:", err);
  process.exit(1);
});
