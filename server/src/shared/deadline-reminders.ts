import { and, eq, isNull, lte, ne, inArray } from "drizzle-orm";
import { db as defaultDb, type Db } from "../db/index";
import { taskAssignees, tasks } from "../db/schema";
import { notify, type NotifyInput } from "./notify";
import { getDirectorIds } from "./recipients";
import { env } from "./env";

/**
 * Находит задачи с приближающимся или уже пропущенным дедлайном, по которым
 * ещё не отправляли напоминание, и шлёт уведомление `deadline_soon`
 * исполнителям и директорам. Возвращает число обработанных задач.
 *
 * Условие: задача не завершена и не отменена, есть дедлайн,
 * дедлайн наступит в ближайшие DEADLINE_REMINDER_HOURS часов (или уже прошёл),
 * и deadlineRemindedAt ещё не проставлен.
 */
export async function runDeadlineCheck(
  database: Db = defaultDb,
  now: Date = new Date(),
): Promise<number> {
  const horizon = new Date(
    now.getTime() + env.DEADLINE_REMINDER_HOURS * 3_600_000,
  );

  const due = await database
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
    })
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "completed"),
        ne(tasks.status, "cancelled"),
        lte(tasks.deadline, horizon),
        isNull(tasks.deadlineRemindedAt),
      ),
    );

  if (due.length === 0) return 0;

  const directorIds = await getDirectorIds(database);
  const taskIds = due.map((t) => t.id);

  const assigneeRows = await database
    .select({ taskId: taskAssignees.taskId, userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(inArray(taskAssignees.taskId, taskIds));

  const assigneesByTask = new Map<number, number[]>();
  for (const r of assigneeRows) {
    const list = assigneesByTask.get(r.taskId) ?? [];
    list.push(r.userId);
    assigneesByTask.set(r.taskId, list);
  }

  for (const task of due) {
    if (!task.deadline) continue;
    const overdue = task.deadline.getTime() < now.getTime();
    const recipients = new Set<number>([
      ...directorIds,
      ...(assigneesByTask.get(task.id) ?? []),
    ]);

    const items: NotifyInput[] = [...recipients].map((userId) => ({
      userId,
      type: "deadline_soon",
      title: overdue ? "Дедлайн просрочен" : "Приближается дедлайн",
      body: task.title,
      link: `/tasks/${task.id}`,
    }));

    await notify(database, items);
    await database
      .update(tasks)
      .set({ deadlineRemindedAt: now })
      .where(eq(tasks.id, task.id));
  }

  return due.length;
}
