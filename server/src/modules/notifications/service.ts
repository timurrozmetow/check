import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index";
import { notifications, type NotificationRow } from "../../db/schema";
import type { NotificationType } from "../../shared/constants";

/** DTO уведомления по контракту API. */
export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

function toDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    isRead: row.isRead,
    createdAt: row.createdAt,
  };
}

const NOTIFICATIONS_LIMIT = 50;

/**
 * Список уведомлений пользователя (createdAt desc, максимум 50)
 * плюс количество непрочитанных отдельным count-запросом.
 */
export async function listNotifications(
  userId: number,
  unreadOnly: boolean,
): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
  const where = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId);

  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATIONS_LIMIT);

  const countRows = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  const unreadCount = countRows[0]?.value ?? 0;

  return { notifications: rows.map(toDto), unreadCount };
}

/**
 * Помечает уведомления прочитанными. С ids — только свои из списка,
 * без ids — все свои непрочитанные.
 */
export async function markNotificationsRead(
  userId: number,
  ids?: number[],
): Promise<void> {
  if (ids && ids.length === 0) return;

  const where = ids
    ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
    : eq(notifications.userId, userId);

  await db.update(notifications).set({ isRead: true }).where(where);
}
