import { sql } from "drizzle-orm";
import { db } from "../db/index";

const TABLES = [
  "activity_log",
  "notifications",
  "files",
  "decision_options",
  "decision_requests",
  "task_updates",
  "task_assignees",
  "tasks",
  "projects",
  "users",
];

/** Полностью очищает данные тестовой БД (с отключением FK-проверок). */
export async function resetDb() {
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0"));
  for (const t of TABLES) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${t}`));
  }
  await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1"));
}
