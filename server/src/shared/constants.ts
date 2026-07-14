/**
 * Единый источник констант домена. Никаких магических строк в коде —
 * только эти значения. Русские подписи живут на клиенте
 * (client/src/lib/labels.ts), здесь — машинные коды.
 */

export const ROLES = ["admin", "director", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = [
  "new",
  "in_progress",
  "review",
  "awaiting_decision",
  "completed",
  "paused",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const UPDATE_STATUSES = ["pending", "approved", "rejected"] as const;
export type UpdateStatus = (typeof UPDATE_STATUSES)[number];

export const DECISION_TYPES = ["choice", "approval"] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const DECISION_STATUSES = ["pending", "decided"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const PROJECT_STATUSES = ["active", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** К чему может быть прикреплён файл (полиморфная связь). */
export const FILE_ENTITY_TYPES = [
  "task",
  "task_update",
  "decision_request",
  "decision_option",
] as const;
export type FileEntityType = (typeof FILE_ENTITY_TYPES)[number];

/** Типы событий в хронологии задачи (activity_log.type). */
export const ACTIVITY_TYPES = [
  "task_created",
  "status_changed",
  "progress_changed",
  "update_approved",
  "decision_requested",
  "decision_made",
  "task_completed",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Типы уведомлений (notifications.type). */
export const NOTIFICATION_TYPES = [
  "task_assigned",
  "update_submitted",
  "update_approved",
  "update_rejected",
  "decision_requested",
  "decision_made",
  "deadline_soon",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Разрешённые MIME-типы загружаемых файлов. */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Шаг прогресса задачи в процентах. */
export const PROGRESS_STEP = 5;

/** Cookie с низкопривилегированным токеном для доступа к статике /uploads. */
export const UPLOADS_COOKIE = "up_token";

/** Статусы задач, считающиеся «активными» для сводок. */
export const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "review",
  "awaiting_decision",
];
