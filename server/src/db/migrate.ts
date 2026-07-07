import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, pool } from "./index";

async function main() {
  console.log("Применяю миграции…");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Миграции применены.");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка миграции:", err);
  process.exit(1);
});
