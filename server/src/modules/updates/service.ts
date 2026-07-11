import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import {
  projects,
  taskAssignees,
  tasks,
  taskUpdates,
  users,
} from "../../db/schema";
import type { Role } from "../../shared/constants";
import { logActivity } from "../../shared/activity";
import { notify, type NotifyInput } from "../../shared/notify";
import { getFilesFor, type FileInfo } from "../../shared/file-info";
import { getAdminIds } from "../../shared/recipients";
import { badRequest, forbidden, notFound } from "../../shared/errors";

export interface UpdateItem {
  id: number;
  taskId: number;
  author: { id: number; name: string; avatar: string | null };
  text: string;
  status: (typeof taskUpdates.$inferSelect)["status"];
  rejectReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  files: FileInfo[];
}

async function buildUpdateItem(updateId: number): Promise<UpdateItem> {
  const [row] = await db
    .select({
      u: taskUpdates,
      authorId: users.id,
      authorName: users.name,
      authorAvatar: users.avatar,
    })
    .from(taskUpdates)
    .innerJoin(users, eq(taskUpdates.authorId, users.id))
    .where(eq(taskUpdates.id, updateId))
    .limit(1);
  if (!row) throw notFound("error.updateNotFound");
  const filesMap = await getFilesFor(db, "task_update", [updateId]);
  return {
    id: row.u.id,
    taskId: row.u.taskId,
    author: {
      id: row.authorId,
      name: row.authorName,
      avatar: row.authorAvatar,
    },
    text: row.u.text,
    status: row.u.status,
    rejectReason: row.u.rejectReason,
    createdAt: row.u.createdAt,
    reviewedAt: row.u.reviewedAt,
    files: filesMap.get(updateId) ?? [],
  };
}

async function isAssignee(taskId: number, userId: number): Promise<boolean> {
  const [row] = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(
      and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function createUpdate(
  taskId: number,
  text: string,
  role: Role,
  userId: number,
): Promise<UpdateItem> {
  const [task] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw notFound("error.taskNotFound");

  if (role === "employee" && !(await isAssignee(taskId, userId))) {
    throw forbidden("error.taskNotAssigned");
  }
  if (role === "director") {
    throw forbidden("error.directorCannotSubmitUpdate");
  }

  const updateId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(taskUpdates)
      .values({ taskId, authorId: userId, text })
      .$returningId();

    const [author] = await tx
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const adminIds = await getAdminIds(tx);
    await notify(
      tx,
      adminIds.map(
        (adminId): NotifyInput => ({
          userId: adminId,
          type: "update_submitted",
          title: "Новое обновление на модерацию",
          body: `${author?.name ?? "Сотрудник"} — «${task.title}»`,
          link: "/moderation",
        }),
      ),
    );
    return inserted!.id;
  });

  return buildUpdateItem(updateId);
}

export type ModerationItem = UpdateItem & {
  task: { id: number; title: string; projectName: string };
};

export async function listModeration(): Promise<ModerationItem[]> {
  const rows = await db
    .select({
      u: taskUpdates,
      authorId: users.id,
      authorName: users.name,
      authorAvatar: users.avatar,
      taskTitle: tasks.title,
      projectName: projects.name,
    })
    .from(taskUpdates)
    .innerJoin(users, eq(taskUpdates.authorId, users.id))
    .innerJoin(tasks, eq(taskUpdates.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(taskUpdates.status, "pending"))
    .orderBy(asc(taskUpdates.createdAt));

  if (rows.length === 0) return [];
  const filesMap = await getFilesFor(
    db,
    "task_update",
    rows.map((r) => r.u.id),
  );

  return rows.map((r) => ({
    id: r.u.id,
    taskId: r.u.taskId,
    author: { id: r.authorId, name: r.authorName, avatar: r.authorAvatar },
    text: r.u.text,
    status: r.u.status,
    rejectReason: r.u.rejectReason,
    createdAt: r.u.createdAt,
    reviewedAt: r.u.reviewedAt,
    files: filesMap.get(r.u.id) ?? [],
    task: { id: r.u.taskId, title: r.taskTitle, projectName: r.projectName },
  }));
}

export type MyUpdateItem = UpdateItem & { task: { id: number; title: string } };

export async function listMyUpdates(userId: number): Promise<MyUpdateItem[]> {
  const rows = await db
    .select({
      u: taskUpdates,
      authorId: users.id,
      authorName: users.name,
      authorAvatar: users.avatar,
      taskTitle: tasks.title,
    })
    .from(taskUpdates)
    .innerJoin(users, eq(taskUpdates.authorId, users.id))
    .innerJoin(tasks, eq(taskUpdates.taskId, tasks.id))
    .where(eq(taskUpdates.authorId, userId))
    .orderBy(desc(taskUpdates.createdAt));

  if (rows.length === 0) return [];
  const filesMap = await getFilesFor(
    db,
    "task_update",
    rows.map((r) => r.u.id),
  );

  return rows.map((r) => ({
    id: r.u.id,
    taskId: r.u.taskId,
    author: { id: r.authorId, name: r.authorName, avatar: r.authorAvatar },
    text: r.u.text,
    status: r.u.status,
    rejectReason: r.u.rejectReason,
    createdAt: r.u.createdAt,
    reviewedAt: r.u.reviewedAt,
    files: filesMap.get(r.u.id) ?? [],
    task: { id: r.u.taskId, title: r.taskTitle },
  }));
}

async function loadPendingUpdate(updateId: number) {
  const [update] = await db
    .select()
    .from(taskUpdates)
    .where(eq(taskUpdates.id, updateId))
    .limit(1);
  if (!update) throw notFound("error.updateNotFound");
  if (update.status !== "pending") {
    throw badRequest("error.updateAlreadyReviewed", "ALREADY_REVIEWED");
  }
  return update;
}

export async function approveUpdate(
  updateId: number,
  adminId: number,
  progress?: number,
): Promise<UpdateItem> {
  const update = await loadPendingUpdate(updateId);

  await db.transaction(async (tx) => {
    await tx
      .update(taskUpdates)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(taskUpdates.id, updateId));

    await logActivity(tx, {
      taskId: update.taskId,
      actorId: adminId,
      type: "update_approved",
      payload: { text: update.text.slice(0, 200) },
    });

    if (progress !== undefined) {
      const [task] = await tx
        .select({ progress: tasks.progress })
        .from(tasks)
        .where(eq(tasks.id, update.taskId))
        .limit(1);
      await tx
        .update(tasks)
        .set({ progress })
        .where(eq(tasks.id, update.taskId));
      await logActivity(tx, {
        taskId: update.taskId,
        actorId: adminId,
        type: "progress_changed",
        payload: { from: task?.progress ?? 0, to: progress },
      });
    }

    await notify(tx, [
      {
        userId: update.authorId,
        type: "update_approved",
        title: "Ваше обновление принято",
        body: update.text.slice(0, 120),
        link: `/tasks/${update.taskId}`,
      },
    ]);
  });

  return buildUpdateItem(updateId);
}

export async function rejectUpdate(
  updateId: number,
  adminId: number,
  reason: string,
): Promise<UpdateItem> {
  const update = await loadPendingUpdate(updateId);

  await db.transaction(async (tx) => {
    await tx
      .update(taskUpdates)
      .set({
        status: "rejected",
        rejectReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(taskUpdates.id, updateId));

    await notify(tx, [
      {
        userId: update.authorId,
        type: "update_rejected",
        title: "Обновление отклонено",
        body: reason.slice(0, 120),
        link: `/tasks/${update.taskId}`,
      },
    ]);
  });

  return buildUpdateItem(updateId);
}
