import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/index";
import { files, projects } from "../db/schema";
import { resetDb } from "./reset";
import { createUser } from "../modules/users/service";
import { createTask } from "../modules/tasks/service";
import { openFileForDownload } from "../modules/files/service";

/**
 * IDOR-фикс: /files/:id/download авторизуется по доступу к РОДИТЕЛЬСКОЙ задаче,
 * а не просто по факту логина. admin/director — ко всем; сотрудник — только к
 * назначенным ему. Проверяем именно слой авторизации: не назначенный сотрудник
 * получает FORBIDDEN ещё до обращения к диску; у имеющих доступ авторизация
 * проходит и падает уже на отсутствии файла (NOT_FOUND) — в тесте на диске его
 * специально нет.
 */
describe("авторизация скачивания вложений (IDOR)", () => {
  beforeEach(resetDb);

  async function setup() {
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
    const task = await createTask(
      {
        title: "Задача emp1",
        projectId: proj!.id,
        assigneeIds: [emp1.id],
        priority: "medium",
      },
      admin.id,
    );
    // Строка вложения к задаче emp1; файла на диске нет — это ок для теста авторизации.
    const [f] = await db
      .insert(files)
      .values({
        entityType: "task",
        entityId: task.id,
        path: "2026/01/nonexistent-secret.png",
        thumbPath: null,
        mime: "image/png",
        size: 123,
        originalName: "secret.png",
        uploadedBy: admin.id,
      })
      .$returningId();
    return { admin, director, emp1, emp2, fileId: f!.id };
  }

  it("не назначенный сотрудник → FORBIDDEN (перебор id чужих вложений закрыт)", async () => {
    const { emp2, fileId } = await setup();
    await expect(
      openFileForDownload(fileId, "employee", emp2.id),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("назначенный сотрудник проходит авторизацию (NOT_FOUND — файла нет на диске)", async () => {
    const { emp1, fileId } = await setup();
    await expect(
      openFileForDownload(fileId, "employee", emp1.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("admin и director имеют доступ к любому вложению", async () => {
    const { admin, director, fileId } = await setup();
    await expect(
      openFileForDownload(fileId, "admin", admin.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      openFileForDownload(fileId, "director", director.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
