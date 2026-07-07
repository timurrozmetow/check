import { beforeAll } from "vitest";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db } from "../db/index";

// Один раз перед всеми тестами применяем миграции к тестовой БД.
// DB_NAME=directorhub_test задан в vitest.config.ts (test.env).
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
});
