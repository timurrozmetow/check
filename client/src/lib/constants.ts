import type { TaskPriority, TaskStatus } from "@/api/types";

/** Активные статусы задач (совпадает с сервером ACTIVE_TASK_STATUSES). */
export const ACTIVE_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "review",
  "awaiting_decision",
];

/** Все статусы задач в порядке жизненного цикла. */
export const ALL_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "review",
  "awaiting_decision",
  "completed",
  "paused",
  "cancelled",
];

export const ALL_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

/** Палитра цветов для новых проектов. */
export const PROJECT_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
];
