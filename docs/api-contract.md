# API-контракт DirectorHub (v1)

Все маршруты — под префиксом `/api/v1`. Аутентификация: заголовок `Authorization: Bearer <accessToken>`.
Формат ошибок везде: `{ "error": { "code": string, "message": string } }` (message — на русском).
Все даты в ответах — ISO-строки (JSON-сериализация `Date`).

Роли: `admin` | `director` | `employee`. Защита ролей: `app.requireRole("admin")` и т.п.,
просто аутентификация: `preHandler: [app.authenticate]`. Текущий пользователь: `req.user.sub` (id), `req.user.role`.

## Общие DTO

```ts
User = { id, name, email, role, avatar: string|null, isActive: boolean, createdAt }

FileInfo = { id, entityType, entityId, url, thumbUrl: string|null, mime, size, originalName, createdAt }
// url вида "/uploads/2026/07/uuid.jpg" — строится через shared/file-info.ts

AssigneeInfo = { id, name, avatar: string|null }

TaskListItem = {
  id, title, description: string|null, projectId,
  project: { id, name, color, icon: string|null },
  status: TaskStatus, progress: number, priority: TaskPriority,
  deadline: string|null, createdAt, completedAt: string|null,
  assignees: AssigneeInfo[],
  pendingUpdatesCount: number,   // только для admin, иначе 0
  hasPendingDecision: boolean
}

TaskDetail = TaskListItem & { files: FileInfo[] }

ActivityItem = { id, type: ActivityType, payload: object|null, createdAt, actor: { id, name } }

UpdateItem = {
  id, taskId, author: AssigneeInfo, text, status: UpdateStatus,
  rejectReason: string|null, createdAt, reviewedAt: string|null, files: FileInfo[]
}

DecisionOption = { id, title, description: string|null, isSelected: boolean, files: FileInfo[] }

DecisionRequestDetail = {
  id, taskId,
  task: { id, title, projectId, projectName, projectColor },
  title, description: string|null, type: "choice"|"approval",
  status: "pending"|"decided", approved: boolean|null,
  directorComment: string|null, createdAt, decidedAt: string|null,
  options: DecisionOption[],   // пусто для type=approval
  files: FileInfo[]
}

ProjectWithStats = {
  id, name, description: string|null, color, icon: string|null, status, createdAt,
  activeTaskCount: number,     // задачи в статусах ACTIVE_TASK_STATUSES
  totalTaskCount: number,
  avgProgress: number          // средний progress активных задач, 0 если их нет, округлить
}
```

## Auth (реализован)

- `POST /auth/login` `{email, password}` → `{accessToken, user: User}` + httpOnly cookie refresh_token
- `POST /auth/refresh` → `{accessToken, user}`
- `POST /auth/logout` → `{ok: true}`
- `GET /auth/me` → `{user}`

## Users — модуль `users` (всё только admin)

- `GET /users` → `{users: User[]}` (все, включая неактивных, сортировка по имени)
- `POST /users` `{name, email, password (min 8), role}` → `{user}` (409 EMAIL_TAKEN если занят)
- `PATCH /users/:id` `{name?, email?, role?, isActive?}` → `{user}`
  — нельзя деактивировать самого себя (400 CANNOT_DEACTIVATE_SELF)
- `POST /users/:id/reset-password` `{password (min 8)}` → `{ok: true}`

## Projects — модуль `projects`

- `GET /projects` → `{projects: ProjectWithStats[]}`
  — admin и director: все проекты; employee: только проекты, где у него есть задачи.
- `POST /projects` (admin) `{name, description?, color?, icon?}` → `{project: ProjectWithStats}`
- `PATCH /projects/:id` (admin) `{name?, description?, color?, icon?, status?}` → `{project}`
- `DELETE /projects/:id` (admin) → `{ok: true}` — 400 PROJECT_HAS_TASKS, если есть задачи.

## Tasks — модуль `tasks`

- `GET /tasks?projectId=&status=&assigneeId=` → `{tasks: TaskListItem[]}`
  — admin/director: все; employee: только назначенные ему (assigneeId игнорируется, всегда свой id).
  — сортировка: по createdAt desc.
- `GET /tasks/:id` → `{task: TaskDetail}` — employee получает 403, если не назначен.
- `GET /tasks/:id/timeline` → `{events: ActivityItem[]}` (по createdAt asc) — та же проверка доступа.
- `POST /tasks` (admin) `{title, description?, projectId, assigneeIds: number[], priority, deadline?: string|null}` → `{task: TaskDetail}`
  — транзакция: insert задачи + assignees + activity `task_created` + уведомления `task_assigned` каждому исполнителю (link `/tasks/:id`).
- `PATCH /tasks/:id` (admin) `{title?, description?, projectId?, assigneeIds?, priority?, deadline?}` → `{task}`
  — при изменении assigneeIds: заменить связи; новым исполнителям уведомление `task_assigned`.
- `PATCH /tasks/:id/status` (admin) `{status: TaskStatus}` → `{task}`
  — транзакция: смена статуса + activity `status_changed` {from, to};
  — при `completed`: `completedAt = new Date()`, progress = 100, activity `task_completed`;
  — при уходе из `completed`: `completedAt = null`.
- `PATCH /tasks/:id/progress` (admin) `{progress: 0..100, кратно 5}` → `{task}` + activity `progress_changed` {from, to}.
- `DELETE /tasks/:id` (admin) → `{ok: true}`.

## Updates — модуль `updates` (модерация)

- `POST /tasks/:taskId/updates` — регистрируется в модуле updates с полным путём
  (`app.post("/api/v1/tasks/:taskId/updates", ...)` без префикса модуля — см. примечание внизу).
  Автор: employee, назначенный на задачу (403 иначе; admin тоже может).
  `{text (min 3)}` → `{update: UpdateItem}` — статус pending, уведомление всем админам `update_submitted` (link `/moderation`).
- `GET /updates/moderation` (admin) → `{updates: (UpdateItem & {task: {id,title,projectName}})[]}` — только pending, по createdAt asc.
- `GET /updates/my` (employee) → `{updates: (UpdateItem & {task: {id,title}})[]}` — свои, по createdAt desc.
- `POST /updates/:id/approve` (admin) `{progress?: number}` → `{update}`
  — транзакция: статус approved, reviewedAt/reviewedBy; activity `update_approved` {text: первые 200 символов};
  — если передан progress — обновить задачу + activity `progress_changed`;
  — уведомление автору `update_approved` (link `/tasks/:taskId`).
- `POST /updates/:id/reject` (admin) `{reason (min 3)}` → `{update}` — уведомление автору `update_rejected`.
- 400 ALREADY_REVIEWED при повторной модерации.

## Decisions — модуль `decisions`

- `POST /decisions` (admin) `{taskId, title, description?, type: "choice"|"approval", options?: [{title, description?}] }`
  → `{request: DecisionRequestDetail}`
  — для choice минимум 2 варианта (400 NEED_OPTIONS); для approval options игнорируются;
  — транзакция: insert request (+options) + задача → статус `awaiting_decision` + activity `decision_requested` {title} + уведомление директорам `decision_requested` (link `/decisions`).
- `GET /decisions?status=pending|decided` (admin, director) → `{requests: DecisionRequestDetail[]}` — по createdAt desc.
- `GET /decisions/:id` (admin, director) → `{request: DecisionRequestDetail}`
- `POST /decisions/:id/decide` (director) `{optionId?: number, approved?: boolean, comment?: string}` → `{request}`
  — 400 ALREADY_DECIDED, если решён;
  — choice: обязателен optionId одного из вариантов (400 INVALID_OPTION); approval: обязателен approved;
  — транзакция: request → decided (+decidedAt, directorComment, approved/is_selected)
    + задача → статус `in_progress` (если была `awaiting_decision`)
    + activity `decision_made` {title, выбранный вариант/approved, comment}
    + уведомления `decision_made` админам и исполнителям задачи (link `/tasks/:taskId`).

## Files — модуль `files`

- `POST /files` — multipart. Поля: `entityType` (task|task_update|decision_request|decision_option), `entityId`, файл(ы) `file`.
  → `{files: FileInfo[]}`
  — проверка прав: task/decision_request/decision_option — только admin; task_update — автор обновления (пока pending) или admin;
  — 404 если сущность не существует; 400 UNSUPPORTED_TYPE если MIME не из ALLOWED_MIME_TYPES (сверять и расширение);
  — сохранять в `uploads/ГГГГ/ММ/<uuid><ext>` (см. env.UPLOADS_DIR), путь в БД — относительный `ГГГГ/ММ/…`;
  — для изображений — превью webp шириной 480: `ГГГГ/ММ/thumb_<uuid>.webp` (sharp, fit inside);
  — крупные файлы стримить на диск (pump/pipeline), не буферизовать целиком.
- `DELETE /files/:id` — admin, либо загрузивший (для task_update, пока обновление pending) → `{ok: true}` (удалить и с диска).

## Notifications — модуль `notifications`

- `GET /notifications?unreadOnly=true|false` → `{notifications: Notification[], unreadCount: number}`
  — только свои, по createdAt desc, максимум 50.
  — Notification = {id, type, title, body: string|null, link: string|null, isRead, createdAt}
- `POST /notifications/read` `{ids?: number[]}` — пометить прочитанными (без ids — все свои) → `{ok: true}`
- `GET /notifications/stream?token=<accessToken>` — SSE. Заголовки: text/event-stream, no-cache, keep-alive.
  Использовать addSseClient/removeSseClient из shared/sse.ts (снятие по req.raw.on("close")).
  Каждые 30 с — комментарий `: ping\n\n`, чтобы соединение не отвалилось. reply.hijack().

## Reports — модуль `reports` (admin)

- `GET /reports/monthly?year=2026&month=7&projectId=` → бинарный .docx
  — заголовки: Content-Type application/vnd.openxmlformats-officedocument.wordprocessingml.document,
    Content-Disposition attachment; filename="report-2026-07.docx".
  Содержимое — по разделу 4.8 ТЗ (титул, сводка, 3 графика PNG, таблица задач, детализация завершённых с фото).
  Графики: генерировать SVG-строку (donut/bar/line) и растрировать в PNG через sharp — без chartjs-node-canvas
  (нативный canvas не собирается на этой машине; метод рендера — деталь реализации, требование = PNG-графики в docx).

## Примечание о регистрации роутов

Каждый модуль экспортирует `export default async function xxxRoutes(app: FastifyInstance)`,
регистрируется в app.ts с префиксом `/api/v1/<module>`. Если модулю нужен путь вне своего префикса
(например `POST /tasks/:taskId/updates` в модуле updates), внутри функции использовать
`app.post("/../tasks/:taskId/updates", ...)` НЕЛЬЗЯ — вместо этого зарегистрировать маршрут как
`app.post("/for-task/:taskId", ...)` под своим префиксом: итоговый путь `/api/v1/updates/for-task/:taskId`.
Клиент использует именно такие пути.

Итого фактические пути updates:
- `POST /api/v1/updates/for-task/:taskId` — создать обновление
- `GET  /api/v1/updates/moderation`, `GET /api/v1/updates/my`
- `POST /api/v1/updates/:id/approve`, `POST /api/v1/updates/:id/reject`
