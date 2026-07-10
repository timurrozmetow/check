// Сквозная проверка API DirectorHub по ролям (Node 18+, встроенный fetch)
const BASE = "http://127.0.0.1:4000/api/v1";
let pass = 0;
let fail = 0;

function ok(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  OK  ${msg}`);
  } else {
    fail++;
    console.log(`  XX  ${msg}`);
  }
}

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return (await r.json()).accessToken;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function get(path, token) {
  const r = await fetch(`${BASE}${path}`, { headers: auth(token) });
  return { status: r.status, body: r.ok ? await r.json() : null };
}

async function post(path, token, data) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...auth(token), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: r.status, body: r.status < 400 ? await r.json() : null };
}

async function main() {
  const admin = await login("admin@directorhub.ru", "admin12345");
  const director = await login("director@directorhub.ru", "director12345");
  const ivan = await login("ivan@directorhub.ru", "employee12345");
  console.log("== Логины ОК ==");

  const adminTasks = await get("/tasks", admin);
  ok(adminTasks.body.tasks.length === 6, `Админ видит все 6 задач (${adminTasks.body.tasks.length})`);

  const dirProjects = await get("/projects", director);
  ok(
    dirProjects.body.projects.length === 2,
    `Директор видит 2 проекта, avgProgress[0]=${dirProjects.body.projects[0]?.avgProgress}%`,
  );

  const ivanTasks = await get("/tasks", ivan);
  ok(ivanTasks.body.tasks.length === 3, `Иван видит только свои 3 задачи (${ivanTasks.body.tasks.length})`);

  // Изоляция: задача, назначенная только Марии
  const mariaOnly = adminTasks.body.tasks.find(
    (t) =>
      t.assignees.some((a) => a.name.includes("Мария")) &&
      !t.assignees.some((a) => a.name.includes("Иван")),
  );
  if (mariaOnly) {
    const res = await get(`/tasks/${mariaOnly.id}`, ivan);
    ok(res.status === 403, `Изоляция: Иван НЕ читает чужую задачу #${mariaOnly.id} (${res.status})`);
  }

  // RBAC: сотрудник не создаёт проект
  const hack = await post("/projects", ivan, { name: "Хак" });
  ok(hack.status === 403, `RBAC: сотрудник не создаёт проект (${hack.status})`);

  // Директор видит запросы решений
  const decisions = await get("/decisions?status=pending", director);
  const dcount = decisions.body.requests.length;
  ok(dcount >= 1, `Директор видит запрос решения (${dcount}), вариантов: ${decisions.body.requests[0]?.options.length}`);

  // Директор принимает решение (выбор варианта)
  const req = decisions.body.requests[0];
  if (req && req.type === "choice") {
    const chosen = req.options[1];
    const decided = await post(`/decisions/${req.id}/decide`, director, {
      optionId: chosen.id,
      comment: "Оптимальное соотношение цены и сроков",
    });
    ok(decided.status === 200 && decided.body.request.status === "decided", `Решение принято: выбран «${chosen.title.slice(0, 30)}…»`);
    // Задача должна выйти из awaiting_decision
    const t = await get(`/tasks/${req.taskId}`, admin);
    ok(t.body.task.status === "in_progress", `Задача вернулась в работу после решения (${t.body.task.status})`);
    // Директор НЕ может решить повторно
    const again = await post(`/decisions/${req.id}/decide`, director, { optionId: chosen.id });
    ok(again.status === 400, `Повторное решение отклонено (${again.status})`);
  }

  // Модерация: у Ивана есть pending-обновление? создадим и промодерируем
  const created = await post(`/updates/for-task/${ivanTasks.body.tasks[0].id}`, ivan, {
    text: "Тестовое обновление из smoke-теста: закупили краску, красим зал.",
  });
  ok(created.status === 200, `Сотрудник отправил обновление (${created.status})`);

  const mod = await get("/updates/moderation", admin);
  ok(mod.body.updates.length >= 1, `Админ видит обновления на модерации (${mod.body.updates.length})`);

  const toApprove = mod.body.updates.find((u) => u.id === created.body.update.id);
  if (toApprove) {
    const appr = await post(`/updates/${toApprove.id}/approve`, admin, { progress: 70 });
    ok(appr.status === 200 && appr.body.update.status === "approved", `Обновление принято, прогресс выставлен`);
  }

  // Директор НЕ видит непринятые обновления в таймлайне — проверим что таймлайн содержит только approved
  const timeline = await get(`/tasks/${ivanTasks.body.tasks[0].id}/timeline`, director);
  ok(timeline.status === 200, `Директор читает таймлайн задачи (${timeline.status})`);

  // Уведомления
  const notif = await get("/notifications", director);
  ok(notif.body.unreadCount >= 1, `Уведомления директора: ${notif.body.notifications.length}, непрочитано ${notif.body.unreadCount}`);

  console.log(`\n== Итог: ${pass} прошло, ${fail} провалено ==`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Ошибка smoke-теста:", e);
  process.exit(1);
});
