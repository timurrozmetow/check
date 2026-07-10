import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import {
  activityLog,
  decisionOptions,
  decisionRequests,
  notifications,
  projects,
  taskAssignees,
  tasks,
  taskUpdates,
  users,
} from "./schema";

/** Дни от текущего момента (отрицательные — в прошлом). */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(18, 0, 0, 0);
  return d;
}

async function main() {
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@directorhub.ru"))
    .limit(1);

  if (existingAdmin) {
    console.log("Seed уже применён (admin@directorhub.ru существует) — пропускаю.");
    await pool.end();
    return;
  }

  console.log("Заполняю базу демо-данными…");

  const [adminHash, directorHash, employeeHash] = await Promise.all([
    argon2.hash("admin12345"),
    argon2.hash("director12345"),
    argon2.hash("employee12345"),
  ]);

  await db.insert(users).values([
    { name: "Тимур (Админ)", email: "admin@directorhub.ru", passwordHash: adminHash, role: "admin" },
    { name: "Рустам Каримович", email: "director@directorhub.ru", passwordHash: directorHash, role: "director" },
    { name: "Иван Петров", email: "ivan@directorhub.ru", passwordHash: employeeHash, role: "employee" },
    { name: "Мария Смирнова", email: "maria@directorhub.ru", passwordHash: employeeHash, role: "employee" },
  ]);
  const allUsers = await db.select().from(users);
  const admin = allUsers.find((u) => u.role === "admin")!;
  const director = allUsers.find((u) => u.role === "director")!;
  const ivan = allUsers.find((u) => u.email === "ivan@directorhub.ru")!;
  const maria = allUsers.find((u) => u.email === "maria@directorhub.ru")!;

  await db.insert(projects).values([
    {
      name: "Кофейня на Ленина",
      description: "Открытие новой кофейни: ремонт, оборудование, персонал",
      color: "#f59e0b",
      icon: "coffee",
    },
    {
      name: "Автомойка «Блеск»",
      description: "Реконструкция и автоматизация действующей автомойки",
      color: "#3b82f6",
      icon: "car",
    },
  ]);
  const allProjects = await db.select().from(projects);
  const cafe = allProjects[0]!;
  const wash = allProjects[1]!;

  await db.insert(tasks).values([
    {
      title: "Ремонт помещения кофейни",
      description:
        "Черновая и чистовая отделка зала 85 м². Электрика под оборудование, вентиляция, барная стойка.",
      projectId: cafe.id,
      status: "in_progress",
      progress: 65,
      priority: "high",
      deadline: daysFromNow(14),
      createdBy: admin.id,
    },
    {
      title: "Закупка кофемашины и оборудования",
      description:
        "Выбрать и купить: кофемашина 2-группная, кофемолка, холодильные витрины, посудомоечная машина.",
      projectId: cafe.id,
      status: "awaiting_decision",
      progress: 40,
      priority: "urgent",
      deadline: daysFromNow(7),
      createdBy: admin.id,
    },
    {
      title: "Найм бариста и администратора",
      description: "Собеседования, стажировка, оформление. Нужно 3 бариста и 1 администратор.",
      projectId: cafe.id,
      status: "new",
      progress: 0,
      priority: "medium",
      deadline: daysFromNow(30),
      createdBy: admin.id,
    },
    {
      title: "Монтаж моечного оборудования",
      description: "Установка портальной мойки, подключение воды и электрики, пусконаладка.",
      projectId: wash.id,
      status: "in_progress",
      progress: 80,
      priority: "high",
      deadline: daysFromNow(5),
      createdBy: admin.id,
    },
    {
      title: "Система онлайн-записи клиентов",
      description: "Внедрить виджет записи на сайт и интеграцию с кассой.",
      projectId: wash.id,
      status: "review",
      progress: 90,
      priority: "medium",
      deadline: daysFromNow(-2),
      createdBy: admin.id,
    },
    {
      title: "Получить разрешение СЭС",
      description: "Собрать документы и получить заключение санэпидемстанции для кофейни.",
      projectId: cafe.id,
      status: "completed",
      progress: 100,
      priority: "high",
      deadline: daysFromNow(-5),
      createdBy: admin.id,
      completedAt: daysFromNow(-6),
    },
  ]);
  const allTasks = await db.select().from(tasks);
  const [tRemont, tKofe, tNaim, tMontazh, tZapis, tSes] = allTasks as [
    (typeof allTasks)[number],
    (typeof allTasks)[number],
    (typeof allTasks)[number],
    (typeof allTasks)[number],
    (typeof allTasks)[number],
    (typeof allTasks)[number],
  ];

  await db.insert(taskAssignees).values([
    { taskId: tRemont.id, userId: ivan.id },
    { taskId: tKofe.id, userId: maria.id },
    { taskId: tNaim.id, userId: maria.id },
    { taskId: tMontazh.id, userId: ivan.id },
    { taskId: tZapis.id, userId: maria.id },
    { taskId: tSes.id, userId: ivan.id },
  ]);

  await db.insert(taskUpdates).values([
    {
      taskId: tRemont.id,
      authorId: ivan.id,
      text: "Завершили штукатурку стен и разводку электрики. Начали укладку плитки за барной стойкой.",
      status: "approved",
      reviewedAt: daysFromNow(-1),
      reviewedBy: admin.id,
    },
    {
      taskId: tRemont.id,
      authorId: ivan.id,
      text: "Привезли материалы для чистовой отделки, приступаем к покраске зала.",
      status: "pending",
    },
    {
      taskId: tMontazh.id,
      authorId: ivan.id,
      text: "Портальная мойка установлена, завтра подключение воды.",
      status: "approved",
      reviewedAt: daysFromNow(-2),
      reviewedBy: admin.id,
    },
    {
      taskId: tZapis.id,
      authorId: maria.id,
      text: "Виджет записи работает на тестовом сайте, жду доступ к кассе для интеграции.",
      status: "pending",
    },
    {
      taskId: tSes.id,
      authorId: ivan.id,
      text: "Заключение СЭС получено, оригинал у бухгалтера.",
      status: "approved",
      reviewedAt: daysFromNow(-6),
      reviewedBy: admin.id,
    },
  ]);

  await db.insert(decisionRequests).values([
    {
      taskId: tKofe.id,
      title: "Выбор кофемашины",
      description:
        "Три варианта под наш бюджет. Отличаются ценой, сроком поставки и гарантией.",
      type: "choice",
      createdBy: admin.id,
    },
  ]);
  const [decisionReq] = await db.select().from(decisionRequests);

  await db.insert(decisionOptions).values([
    {
      requestId: decisionReq!.id,
      title: "La Marzocco Linea PB (Италия)",
      description: "1 250 000 ₽ · поставка 3 недели · гарантия 2 года. Флагман, максимальный ресурс.",
    },
    {
      requestId: decisionReq!.id,
      title: "Nuova Simonelli Aurelia (Италия)",
      description: "870 000 ₽ · поставка 1 неделя · гарантия 1 год. Оптимум цена/качество.",
    },
    {
      requestId: decisionReq!.id,
      title: "Proxima F20 (Китай)",
      description: "420 000 ₽ · есть на складе · гарантия 1 год. Бюджетный вариант.",
    },
  ]);

  const seedActivity = [
    { taskId: tRemont.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    { taskId: tKofe.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    { taskId: tNaim.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    { taskId: tMontazh.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    { taskId: tZapis.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    { taskId: tSes.id, actorId: admin.id, type: "task_created" as const, payload: {} },
    {
      taskId: tRemont.id,
      actorId: admin.id,
      type: "update_approved" as const,
      payload: { text: "Завершили штукатурку стен и разводку электрики." },
    },
    {
      taskId: tKofe.id,
      actorId: admin.id,
      type: "decision_requested" as const,
      payload: { title: "Выбор кофемашины" },
    },
    {
      taskId: tSes.id,
      actorId: admin.id,
      type: "task_completed" as const,
      payload: {},
    },
  ];
  await db.insert(activityLog).values(seedActivity);

  await db.insert(notifications).values([
    {
      userId: director.id,
      type: "decision_requested",
      title: "Требуется ваше решение: выбор кофемашины",
      body: "Задача «Закупка кофемашины и оборудования»",
      link: `/tasks/${tKofe.id}`,
    },
    {
      userId: admin.id,
      type: "update_submitted",
      title: "Новое обновление на модерацию",
      body: "Иван Петров — «Ремонт помещения кофейни»",
      link: `/moderation`,
    },
  ]);

  console.log("Готово. Аккаунты:");
  console.log("  Админ:     admin@directorhub.ru / admin12345");
  console.log("  Директор:  director@directorhub.ru / director12345");
  console.log("  Сотрудник: ivan@directorhub.ru / employee12345");
  console.log("  Сотрудник: maria@directorhub.ru / employee12345");
  await pool.end();
}

main().catch((err) => {
  console.error("Ошибка seed:", err);
  process.exit(1);
});
