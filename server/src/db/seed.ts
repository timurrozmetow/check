import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { users } from "./schema";

/**
 * Создаёт единственную учётную запись администратора.
 * Остальных пользователей, проекты и задачи админ заводит сам из интерфейса.
 */
async function main() {
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@directorhub.ru"))
    .limit(1);

  if (existingAdmin) {
    console.log("Администратор уже существует — пропускаю.");
    await pool.end();
    return;
  }

  const passwordHash = await argon2.hash("admin12345");
  await db.insert(users).values({
    name: "Администратор",
    email: "admin@directorhub.ru",
    passwordHash,
    role: "admin",
  });

  console.log("Готово. Учётная запись администратора:");
  console.log("  Email:  admin@directorhub.ru");
  console.log("  Пароль: admin12345");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка seed:", err);
  process.exit(1);
});
