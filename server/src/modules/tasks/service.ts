import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "../../db/index";
import {
  activityLog,
  decisionOptions,
  decisionRequests,
  projects,
  taskAssignees,
  tasks,
  taskUpdates,
  users,
} from "../../db/schema";
import type { Role, TaskStatus } from "../../shared/constants";
import { logActivity, normalizePayload } from "../../shared/activity";
import { notify, type NotifyInput } from "../../shared/notify";
import { getFilesFor, type FileInfo } from "../../shared/file-info";
import { deleteFilesForEntities } from "../files/service";
import { forbidden, notFound } from "../../shared/errors";
import type { CreateTaskInput, UpdateTaskInput } from "./schemas";

export interface AssigneeInfo {
  id: number;
  name: string;
  avatar: string | null;
}

export interface TaskListItem {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  project: { id: number; name: string; color: string; icon: string | null };
  status: TaskStatus;
  progress: number;
  priority: (typeof tasks.$inferSelect)["priority"];
  deadline: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  assignees: AssigneeInfo[];
  pendingUpdatesCount: number;
  hasPendingDecision: boolean;
}

export type TaskDetail = TaskListItem & { files: FileInfo[] };

export interface ActivityItem {
  id: number;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  actor: { id: number; name: string };
}

type TaskWithProject = {
  task: typeof tasks.$inferSelect;
  projectName: string;
  projectColor: string;
  projectIcon: string | null;
};

/** Догружает исполнителей / счётчики к базовым строкам задач (без N+1). */
async function enrich(
  rows: TaskWithProject[],
  role: Role,
): Promise<TaskListItem[]> {
  if (rows.length === 0) return [];
  const taskIds = rows.map((r) => r.task.id);

  const [assigneeRows, pendingUpdateRows, pendingDecisionRows] =
    await Promise.all([
      db
        .select({
          taskId: taskAssignees.taskId,
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(inArray(taskAssignees.taskId, taskIds)),
      role === "admin"
        ? db
            .select({ taskId: taskUpdates.taskId, value: count() })
            .from(taskUpdates)
            .where(
              and(
                inArray(taskUpdates.taskId, taskIds),
                eq(taskUpdates.status, "pending"),
              ),
            )
            .groupBy(taskUpdates.taskId)
        : Promise.resolve([] as { taskId: number; value: number }[]),
      db
        .select({ taskId: decisionRequests.taskId })
        .from(decisionRequests)
        .where(
          and(
            inArray(decisionRequests.taskId, taskIds),
            eq(decisionRequests.status, "pending"),
          ),
        ),
    ]);

  const assigneesByTask = new Map<number, AssigneeInfo[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ id: a.id, name: a.name, avatar: a.avatar });
    assigneesByTask.set(a.taskId, list);
  }
  const pendingByTask = new Map<number, number>();
  for (const p of pendingUpdateRows) {
    pendingByTask.set(p.taskId, Number(p.value));
  }
  const pendingDecisionSet = new Set(pendingDecisionRows.map((r) => r.taskId));

  return rows.map((r) => ({
    id: r.task.id,
    title: r.task.title,
    description: r.task.description,
    projectId: r.task.projectId,
    project: {
      id: r.task.projectId,
      name: r.projectName,
      color: r.projectColor,
      icon: r.projectIcon,
    },
    status: r.task.status,
    progress: r.task.progress,
    priority: r.task.priority,
    deadline: r.task.deadline,
    createdAt: r.task.createdAt,
    completedAt: r.task.completedAt,
    assignees: assigneesByTask.get(r.task.id) ?? [],
    pendingUpdatesCount: pendingByTask.get(r.task.id) ?? 0,
    hasPendingDecision: pendingDecisionSet.has(r.task.id),
  }));
}

const baseSelect = {
  task: tasks,
  projectName: projects.name,
  projectColor: projects.color,
  projectIcon: projects.icon,
};

export async function listTasks(
  role: Role,
  userId: number,
  filters: { projectId?: number; status?: TaskStatus; assigneeId?: number },
): Promise<TaskListItem[]> {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(tasks.status, filters.status));

  if (role === "employee") {
    // Сотрудник видит только свои задачи
    const rows = await db
      .select(baseSelect)
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, userId), ...conditions))
      .orderBy(desc(tasks.createdAt));
    return enrich(rows, role);
  }

  // admin / director
  if (filters.assigneeId) {
    const rows = await db
      .select(baseSelect)
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .where(and(eq(taskAssignees.userId, filters.assigneeId), ...conditions))
      .orderBy(desc(tasks.createdAt));
    return enrich(rows, role);
  }

  const rows = await db
    .select(baseSelect)
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt));
  return enrich(rows, role);
}

async function assertAccess(taskId: number, role: Role, userId: number) {
  if (role !== "employee") return;
  const [row] = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(
      and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)),
    )
    .limit(1);
  if (!row) throw forbidden("error.taskNotAssigned");
}

async function getListItem(taskId: number, role: Role): Promise<TaskListItem> {
  const [row] = await db
    .select(baseSelect)
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!row) throw notFound("error.taskNotFound");
  const [item] = await enrich([row], role);
  return item!;
}

export async function getTaskDetail(
  taskId: number,
  role: Role,
  userId: number,
): Promise<TaskDetail> {
  await assertAccess(taskId, role, userId);
  const item = await getListItem(taskId, role);
  const filesMap = await getFilesFor(db, "task", [taskId]);
  return { ...item, files: filesMap.get(taskId) ?? [] };
}

export async function getTimeline(
  taskId: number,
  role: Role,
  userId: number,
): Promise<ActivityItem[]> {
  await assertAccess(taskId, role, userId);
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  const rows = await db
    .select({
      id: activityLog.id,
      type: activityLog.type,
      payload: activityLog.payload,
      createdAt: activityLog.createdAt,
      actorId: users.id,
      actorName: users.name,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.actorId, users.id))
    .where(eq(activityLog.taskId, taskId))
    .orderBy(asc(activityLog.createdAt), asc(activityLog.id));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: normalizePayload(r.payload),
    createdAt: r.createdAt,
    actor: { id: r.actorId, name: r.actorName },
  }));
}

async function replaceAssignees(
  tx: Tx,
  taskId: number,
  assigneeIds: number[],
): Promise<number[]> {
  const existing = await tx
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, taskId));
  const existingIds = new Set(existing.map((e) => e.userId));

  await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  if (assigneeIds.length > 0) {
    await tx
      .insert(taskAssignees)
      .values(assigneeIds.map((userId) => ({ taskId, userId })));
  }
  // Вернуть новых (кому раньше не была назначена)
  return assigneeIds.filter((id) => !existingIds.has(id));
}

function parseDeadline(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

export async function createTask(
  input: CreateTaskInput,
  actorId: number,
): Promise<TaskDetail> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) throw notFound("error.projectNotFound");

  const taskId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description ?? null,
        projectId: input.projectId,
        priority: input.priority,
        deadline: parseDeadline(input.deadline),
        createdBy: actorId,
      })
      .$returningId();
    const newId = inserted!.id;

    if (input.assigneeIds.length > 0) {
      await tx
        .insert(taskAssignees)
        .values(input.assigneeIds.map((userId) => ({ taskId: newId, userId })));
    }

    await logActivity(tx, {
      taskId: newId,
      actorId,
      type: "task_created",
      payload: { title: input.title },
    });

    await notify(
      tx,
      input.assigneeIds.map(
        (userId): NotifyInput => ({
          userId,
          type: "task_assigned",
          title: "Вам назначена задача",
          body: input.title,
          link: `/tasks/${newId}`,
        }),
      ),
    );

    return newId;
  });

  return getTaskDetail(taskId, "admin", actorId);
}

export async function updateTask(
  taskId: number,
  input: UpdateTaskInput,
  actorId: number,
): Promise<TaskDetail> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);
    if (!project) throw notFound("error.projectNotFound");
  }

  await db.transaction(async (tx) => {
    const taskFields = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.deadline !== undefined
        ? {
            deadline: parseDeadline(input.deadline),
            // Новый дедлайн — разрешаем повторное напоминание
            deadlineRemindedAt: null,
          }
        : {}),
    };
    // UPDATE выполняем только если есть что менять в колонках задачи.
    // Иначе (например, правим ТОЛЬКО исполнителей) Drizzle сгенерирует
    // «UPDATE tasks SET WHERE id = ?» — синтаксическая ошибка MariaDB → 500.
    if (Object.keys(taskFields).length > 0) {
      await tx.update(tasks).set(taskFields).where(eq(tasks.id, taskId));
    }

    if (input.assigneeIds !== undefined) {
      const newIds = await replaceAssignees(tx, taskId, input.assigneeIds);
      await notify(
        tx,
        newIds.map(
          (userId): NotifyInput => ({
            userId,
            type: "task_assigned",
            title: "Вам назначена задача",
            body: input.title ?? task.title,
            link: `/tasks/${taskId}`,
          }),
        ),
      );
    }
  });

  return getTaskDetail(taskId, "admin", actorId);
}

export async function changeStatus(
  taskId: number,
  status: TaskStatus,
  actorId: number,
): Promise<TaskDetail> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  await db.transaction(async (tx) => {
    const patch: Partial<typeof tasks.$inferInsert> = { status };
    if (status === "completed") {
      patch.completedAt = new Date();
      patch.progress = 100;
    } else if (task.status === "completed") {
      patch.completedAt = null;
      // Возврат из «завершено»: снимаем 100%, иначе активная задача висит с
      // полным прогрессом и завышает avgProgress. Ставим на шаг ниже.
      if (task.progress >= 100) patch.progress = 95;
    }

    await tx.update(tasks).set(patch).where(eq(tasks.id, taskId));

    await logActivity(tx, {
      taskId,
      actorId,
      type: "status_changed",
      payload: { from: task.status, to: status },
    });

    // Фиксируем изменение прогресса при возврате из «завершено» (аудит таймлайна).
    if (
      status !== "completed" &&
      patch.progress !== undefined &&
      patch.progress !== task.progress
    ) {
      await logActivity(tx, {
        taskId,
        actorId,
        type: "progress_changed",
        payload: { from: task.progress, to: patch.progress },
      });
    }

    if (status === "completed") {
      await logActivity(tx, {
        taskId,
        actorId,
        type: "task_completed",
        payload: {},
      });
    }
  });

  return getTaskDetail(taskId, "admin", actorId);
}

export async function changeProgress(
  taskId: number,
  progress: number,
  actorId: number,
): Promise<TaskDetail> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ progress }).where(eq(tasks.id, taskId));
    await logActivity(tx, {
      taskId,
      actorId,
      type: "progress_changed",
      payload: { from: task.progress, to: progress },
    });
  });

  return getTaskDetail(taskId, "admin", actorId);
}

export async function deleteTask(taskId: number): Promise<void> {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  // Строки task_updates / decision_* / activity_log / assignees удалит каскад
  // внешнего ключа. А вот вложения (files) внешним ключом не связаны —
  // подчищаем их (в БД и на диске) вручную, до удаления задачи.
  const updateIds = (
    await db
      .select({ id: taskUpdates.id })
      .from(taskUpdates)
      .where(eq(taskUpdates.taskId, taskId))
  ).map((r) => r.id);
  const decisionIds = (
    await db
      .select({ id: decisionRequests.id })
      .from(decisionRequests)
      .where(eq(decisionRequests.taskId, taskId))
  ).map((r) => r.id);
  const optionIds =
    decisionIds.length > 0
      ? (
          await db
            .select({ id: decisionOptions.id })
            .from(decisionOptions)
            .where(inArray(decisionOptions.requestId, decisionIds))
        ).map((r) => r.id)
      : [];

  await deleteFilesForEntities([
    { entityType: "task", entityIds: [taskId] },
    { entityType: "task_update", entityIds: updateIds },
    { entityType: "decision_request", entityIds: decisionIds },
    { entityType: "decision_option", entityIds: optionIds },
  ]);

  await db.delete(tasks).where(eq(tasks.id, taskId));
}
