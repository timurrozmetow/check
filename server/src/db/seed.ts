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
  const password = process.env.ADMIN_PASSWORD ?? "admin12345";
  const name = process.env.ADMIN_NAME ?? "Администратор";

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
