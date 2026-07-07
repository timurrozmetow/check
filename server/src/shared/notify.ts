import { notifications } from "../db/schema";
import type { Db, Tx } from "../db/index";
import type { NotificationType } from "./constants";
import { pushSse } from "./sse";

export interface NotifyInput {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string;
  /** Внутренний роут приложения, например /tasks/5 */
  link?: string;
}

/**
 * Создаёт уведомления (в рамках транзакции, если передана)
 * и пушит их в открытые SSE-соединения получателей.
 */
export async function notify(dbOrTx: Db | Tx, items: NotifyInput[]) {
  if (items.length === 0) return;
  await dbOrTx.insert(notifications).values(
    items.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  );
  for (const n of items) {
    pushSse(n.userId, "notification", {
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    });
  }
}
