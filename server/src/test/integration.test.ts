import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import {
  notifications,
  projects,
  taskAssignees,
  tasks,
  users,
} from "../db/schema";
import { resetDb } from "./reset";
import { createUser } from "../modules/users/service";
import {
  createTask,
  getTaskDetail,
} from "../modules/tasks/service";
import {
  createDecision,
  decideDecision,
} from "../modules/decisions/service";
import { runDeadlineCheck } from "../shared/deadline-reminders";
import { AppError } from "../shared/errors";

async function seedBase() {
  const admin = await createUser({
    name: "Админ",
    email: "a@t.ru",
    password: "password123",
    role: "admin",
  });
  const director = await createUser({
    name: "Директор",
    email: "d@t.ru",
    password: "password123",
    role: "director",
  });
  const emp1 = await createUser({
    name: "Сотрудник 1",
    email: "e1@t.ru",
    password: "password123",
    role: "employee",
  });
  const emp2 = await createUser({
    name: "Сотрудник 2",
    email: "e2@t.ru",
    password: "password123",
    role: "employee",
  });
  const [proj] = await db
    .insert(projects)
    .values({ name: "Проект", color: "#6366f1" })
    .$returningId();
  return { admin, director, emp1, emp2, projectId: proj!.id };
}

describe("users service", () => {
  beforeEach(resetDb);

  it("создаёт пользователя без хеша пароля в ответе", async () => {
    const u = await createUser({
      name: "Тест",
      email: "u@t.ru",
      password: "password123",
      role: "employee",
    });
    expect(u.email).toBe("u@t.ru");
    expect(u).not.toHaveProperty("passwordHash");
  });

  it("не даёт создать пользователя с занятым email", async () => {
    await createUser({
      name: "Первый",
      email: "dup@t.ru",
      password: "password123",
      role: "employee",
    });
    await expect(
      createUser({
        name: "Второй",
        email: "dup@t.ru",
        password: "password123",
        role: "employee",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
});

describe("tasks service — изоляция ролей", () => {
  beforeEach(resetDb);

  it("сотрудник не видит чужую задачу", async () => {
    const { admin, emp1, emp2, projectId } = await seedBase();
    const task = await createTask(
      {
        title: "Задача emp1",
        projectId,
        assigneeIds: [emp1.id],
        priority: "medium",
      },
      admin.id,
    );

    // Назначенный сотрудник видит
    const seen = await getTaskDetail(task.id, "employee", emp1.id);
    expect(seen.id).toBe(task.id);

    // Другой сотрудник — forbidden
    await expect(
      getTaskDetail(task.id, "employee", emp2.id),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("создание задачи уведомляет исполнителей", async () => {
    const { admin, emp1, projectId } = await seedBase();
    await createTask(
      {
        title: "Новая",
        projectId,
        assigneeIds: [emp1.id],
        priority: "high",
      },
      admin.id,
    );
    const notif = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, emp1.id));
    expect(notif.some((n) => n.type === "task_assigned")).toBe(true);
  });
});

describe("decisions service — поток решения", () => {
  beforeEach(resetDb);

  it("создание запроса переводит задачу в awaiting_decision и уведомляет директора", async () => {
    const { admin, director, emp1, projectId } = await seedBase();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp1.id], priority: "medium" },
      admin.id,
    );
    const req = await createDecision(
      {
        taskId: task.id,
        title: "Выбор",
        type: "choice",
        options: [{ title: "A" }, { title: "B" }],
      },
      admin.id,
    );
    expect(req.options).toHaveLength(2);

    const [t] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(t!.status).toBe("awaiting_decision");

    const dNotif = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, director.id));
    expect(dNotif.some((n) => n.type === "decision_requested")).toBe(true);
  });

  it("директор решает; повторное решение отклоняется", async () => {
    const { admin, director, emp1, projectId } = await seedBase();
    const task = await createTask(
      { title: "Т", projectId, assigneeIds: [emp1.id], priority: "medium" },
      admin.id,
    );
    const req = await createDecision(
      {
        taskId: task.id,
        title: "Выбор",
        type: "choice",
        options: [{ title: "A" }, { title: "B" }],
      },
      admin.id,
    );
    const optionId = req.options[0]!.id;

    const decided = await decideDecision(
      req.id,
      { optionId, comment: "ок" },
      director.id,
    );
    expect(decided.status).toBe("decided");
    expect(decided.options.find((o) => o.id === optionId)?.isSelected).toBe(
      true,
    );

    // Задача вернулась в работу
    const [t] = await db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(t!.status).toBe("in_progress");

    // Повторное решение — ошибка ALREADY_DECIDED
    await expect(
      decideDecision(req.id, { optionId }, director.id),
    ).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
  });
});

describe("напоминания о дедлайнах", () => {
  beforeEach(resetDb);

  it("шлёт deadline_soon и не дублирует при повторном прогоне", async () => {
    const { admin, director, emp1, projectId } = await seedBase();
    const now = new Date("2026-07-07T12:00:00Z");

    // Задача с уже прошедшим дедлайном, назначена emp1
    const [inserted] = await db
      .insert(tasks)
      .values({
        title: "Просроченная",
        projectId,
        status: "in_progress",
        priority: "high",
        deadline: new Date("2026-07-06T12:00:00Z"),
        createdBy: admin.id,
      })
      .$returningId();
    await db
      .insert(taskAssignees)
      .values({ taskId: inserted!.id, userId: emp1.id });

    const count1 = await runDeadlineCheck(db, now);
    expect(count1).toBe(1);

    // Уведомления получили и директор, и исполнитель
    const all = await db.select().from(notifications);
    const deadlineNotifs = all.filter((n) => n.type === "deadline_soon");
    const recipientIds = deadlineNotifs.map((n) => n.userId);
    expect(recipientIds).toContain(director.id);
    expect(recipientIds).toContain(emp1.id);

    // Повторный прогон — уже отправлено, дубля нет
    const count2 = await runDeadlineCheck(db, now);
    expect(count2).toBe(0);
  });

  it("не трогает задачи с далёким дедлайном и завершённые", async () => {
    const { admin, projectId } = await seedBase();
    const now = new Date("2026-07-07T12:00:00Z");

    await db.insert(tasks).values([
      {
        title: "Далёкая",
        projectId,
        status: "in_progress",
        priority: "low",
        deadline: new Date("2026-08-01T12:00:00Z"),
        createdBy: admin.id,
      },
      {
        title: "Завершённая просроченная",
        projectId,
        status: "completed",
        priority: "low",
        deadline: new Date("2026-07-01T12:00:00Z"),
        createdBy: admin.id,
      },
    ]);

    const count = await runDeadlineCheck(db, now);
    expect(count).toBe(0);
  });
});
