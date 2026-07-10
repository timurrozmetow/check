import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { activityLog, projects, tasks } from "../db/schema";
import { resetDb } from "./reset";
import { createUser, updateUser } from "../modules/users/service";
import { createTask, changeStatus } from "../modules/tasks/service";
import { createDecision } from "../modules/decisions/service";
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
