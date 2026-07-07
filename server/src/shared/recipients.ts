import { and, eq } from "drizzle-orm";
import { users } from "../db/schema";
import type { Db, Tx } from "../db/index";

/** ID всех активных админов (получатели модерационных уведомлений). */
export async function getAdminIds(dbOrTx: Db | Tx): Promise<number[]> {
  const rows = await dbOrTx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

/** ID всех активных директоров (получатели запросов решений). */
export async function getDirectorIds(dbOrTx: Db | Tx): Promise<number[]> {
  const rows = await dbOrTx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "director"), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}
