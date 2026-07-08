import { activityLog } from "../db/schema";
import type { Db, Tx } from "../db/index";
import type { ActivityType } from "./constants";

export interface ActivityInput {
  taskId: number;
  actorId: number;
  type: ActivityType;
  payload?: Record<string, unknown>;
}

/** Записывает событие в хронологию задачи. */
export async function logActivity(dbOrTx: Db | Tx, event: ActivityInput) {
  await dbOrTx.insert(activityLog).values({
    taskId: event.taskId,
    actorId: event.actorId,
    type: event.type,
    payload: event.payload ?? null,
  });
}

/**
 * Нормализует payload из БД. MariaDB хранит JSON как текст, и mysql2 отдаёт
 * его строкой — тогда `.to`/`.from` были бы undefined. Парсим при чтении.
 */
export function normalizePayload(
  value: unknown,
): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}
