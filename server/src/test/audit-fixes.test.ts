import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { activityLog, files, projects, tasks, taskUpdates } from "../db/schema";
import { resetDb } from "./reset";
import { createUser, updateUser } from "../modules/users/service";
import { createTask, changeStatus, deleteTask } from "../modules/tasks/service";
import { createDecision, decideDecision } from "../modules/decisions/service";
import { listNotifications } from "../modules/notifications/service";
import {
  approveUpdate,
  createUpdate,
  deleteUpdate,
  listModeration,
  listTaskUpdates,
} from "../modules/updates/service";
import { gatherReportData } from "../modules/reports/service";

/**
 * Регрессионные тесты на баги, найденные аудитом и починенные.
 * Каждый describe соответствует находке (# из отчёта).
 */

async function seed() {
  const admin = await createUser({
    name: "Админ",
    email: "a@t.ru",
    password: "password123",
    role: "admin",
  });
  const emp = await createUser({
    name: "Сотрудник",
    email: "e@t.ru",
    password: "password123",
    role: "employee",
  });
  const [proj] = await db
    .insert(projects)
    .values({ name: "Проект", color: "#6366f1" })
    .$returningId();
  return { admin, emp, projectId: proj!.id };
}

describe("#4 запрос решения по закрытой задаче отклоняется", () => {
  beforeEach(resetDb);

  it("нельзя запросить решение по завершённой задаче", async () => {
    const { admin, emp, projectId } = await seed();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    await changeStatus(task.id, "completed", admin.id);
    await expect(
      createDecision(
        {
          taskId: task.id,
          title: "Выбор",
          type: "choice",
          options: [{ title: "A" }, { title: "B" }],
        },
        admin.id,
      ),
    ).rejects.toMatchObject({ code: "TASK_CLOSED" });
  });
});

describe("#10 возврат из «завершено» сбрасывает прогресс", () => {
  beforeEach(resetDb);

  it("прогресс не остаётся 100% и пишется событие progress_changed", async () => {
    const { admin, emp, projectId } = await seed();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    await changeStatus(task.id, "completed", admin.id);
    const reopened = await changeStatus(task.id, "in_progress", admin.id);

    expect(reopened.status).toBe("in_progress");
    expect(reopened.progress).toBeLessThan(100);

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.taskId, task.id));
    expect(events.some((e) => e.type === "progress_changed")).toBe(true);
  });
});

describe("#11 занятый email при обновлении пользователя", () => {
  beforeEach(resetDb);

  it("updateUser с чужим email → EMAIL_TAKEN", async () => {
    const { admin } = await seed();
    const other = await createUser({
      name: "Другой",
      email: "other@t.ru",
      password: "password123",
      role: "employee",
    });
    await expect(
      updateUser(other.id, { email: "a@t.ru" }, admin.id),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
});

describe("#9 отчёт: завершённые вне месяца не искажают цифры", () => {
  beforeEach(resetDb);

  it("пончик и сводка согласованы (задача завершена после месяца)", async () => {
    const { admin, projectId } = await seed();
    // Задача создана в июне, «завершена» 3 августа — для отчёта за июль она
    // была ещё активной; не должна считаться завершённой в июле.
    await db.insert(tasks).values({
      title: "Завершена после месяца",
      projectId,
      status: "completed",
      priority: "low",
      progress: 100,
      createdAt: new Date(2026, 5, 15, 12, 0, 0),
      completedAt: new Date(2026, 7, 3, 12, 0, 0),
      createdBy: admin.id,
    });

    const report = await gatherReportData(2026, 7);
    expect(report.summary.completedCount).toBe(0);
    expect(report.statusCounts.completed).toBe(0);
    expect(report.statusCounts.in_progress).toBe(1);
  });

  it("задача, завершённая внутри месяца, считается завершённой", async () => {
    const { admin, projectId } = await seed();
    await db.insert(tasks).values({
      title: "Завершена в июле",
      projectId,
      status: "completed",
      priority: "low",
      progress: 100,
      createdAt: new Date(2026, 5, 15, 12, 0, 0),
      completedAt: new Date(2026, 6, 15, 12, 0, 0),
      createdBy: admin.id,
    });

    const report = await gatherReportData(2026, 7);
    expect(report.summary.completedCount).toBe(1);
    expect(report.statusCounts.completed).toBe(1);
  });
});

describe("отзыв обновления сотрудником (QA)", () => {
  beforeEach(resetDb);

  it("автор отзывает своё pending-обновление — оно исчезает из модерации", async () => {
    const { admin, emp, projectId } = await seed();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    const update = await createUpdate(task.id, "Готово частично", "employee", emp.id);
    expect(await listModeration()).toHaveLength(1);

    await deleteUpdate(update.id, "employee", emp.id);

    expect(await listModeration()).toHaveLength(0);
    const rows = await db
      .select()
      .from(taskUpdates)
      .where(eq(taskUpdates.id, update.id));
    expect(rows).toHaveLength(0);
  });

  it("нельзя отозвать чужое обновление", async () => {
    const { admin, emp, projectId } = await seed();
    const other = await createUser({
      name: "Другой",
      email: "o@t.ru",
      password: "password123",
      role: "employee",
    });
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    const update = await createUpdate(task.id, "Готово", "employee", emp.id);
    await expect(
      deleteUpdate(update.id, "employee", other.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("нельзя отозвать уже промодерированное обновление", async () => {
    const { admin, emp, projectId } = await seed();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    const update = await createUpdate(task.id, "Готово", "employee", emp.id);
    await approveUpdate(update.id, admin.id);
    await expect(
      deleteUpdate(update.id, "employee", emp.id),
    ).rejects.toMatchObject({ code: "ALREADY_REVIEWED" });
  });
});

describe("вложения обновлений видны на странице задачи (QA)", () => {
  beforeEach(resetDb);

  async function seedUpdateWithFile() {
    const { admin, emp, projectId } = await seed();
    const director = await createUser({
      name: "Директор",
      email: "dir@t.ru",
      password: "password123",
      role: "director",
    });
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    const update = await createUpdate(task.id, "Готово, см. фото", "employee", emp.id);
    await db.insert(files).values({
      entityType: "task_update",
      entityId: update.id,
      path: "2026/07/photo.png",
      thumbPath: "2026/07/thumb_photo.webp",
      mime: "image/png",
      size: 1234,
      originalName: "photo.png",
      uploadedBy: emp.id,
    });
    return { admin, emp, director, task };
  }

  it("админ и директор видят обновление сотрудника с вложением", async () => {
    const { admin, director, emp, task } = await seedUpdateWithFile();

    for (const viewer of [
      { role: "admin" as const, id: admin.id },
      { role: "director" as const, id: director.id },
    ]) {
      const list = await listTaskUpdates(task.id, viewer.role, viewer.id);
      expect(list).toHaveLength(1);
      expect(list[0]!.files).toHaveLength(1);
      expect(list[0]!.files[0]!.url).toBe("/uploads/2026/07/photo.png");
    }
    // автор тоже видит своё
    const own = await listTaskUpdates(task.id, "employee", emp.id);
    expect(own[0]!.files).toHaveLength(1);
  });

  it("посторонний сотрудник не видит чужую задачу", async () => {
    const { task } = await seedUpdateWithFile();
    const stranger = await createUser({
      name: "Чужой",
      email: "x@t.ru",
      password: "password123",
      role: "employee",
    });
    await expect(
      listTaskUpdates(task.id, "employee", stranger.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("локализуемое тело decision_made (QA)", () => {
  beforeEach(resetDb);

  it("уведомление decision_made несёт params для локализации", async () => {
    const { admin, emp, projectId } = await seed();
    const director = await createUser({
      name: "Дир",
      email: "dir2@t.ru",
      password: "password123",
      role: "director",
    });
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    const dec = await createDecision(
      {
        taskId: task.id,
        title: "Выбор поставщика",
        type: "choice",
        options: [{ title: "A" }, { title: "B" }],
      },
      admin.id,
    );
    await decideDecision(dec.id, { optionId: dec.options[0]!.id }, director.id);

    const { notifications } = await listNotifications(emp.id, false);
    const made = notifications.find((n) => n.type === "decision_made");
    expect(made).toBeTruthy();
    expect(made!.params).toMatchObject({
      decision: "choice",
      title: "Выбор поставщика",
      option: "A",
    });
  });
});

describe("удаление задачи админом (QA)", () => {
  beforeEach(resetDb);

  it("задача удаляется вместе с её обновлениями (каскад)", async () => {
    const { admin, emp, projectId } = await seed();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp.id], priority: "medium" },
      admin.id,
    );
    await createUpdate(task.id, "Промежуточный отчёт", "employee", emp.id);

    await deleteTask(task.id);

    const taskRows = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(taskRows).toHaveLength(0);
    const updateRows = await db
      .select()
      .from(taskUpdates)
      .where(eq(taskUpdates.taskId, task.id));
    expect(updateRows).toHaveLength(0);
  });
});
