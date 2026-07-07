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
