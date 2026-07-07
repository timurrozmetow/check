import type {
  DecisionStatus,
  NotificationType,
  ProjectStatus,
  Role,
  TaskPriority,
  TaskStatus,
  UpdateStatus,
} from "@/api/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Администратор",
  director: "Директор",
  employee: "Сотрудник",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  awaiting_decision: "Ждёт решения",
  completed: "Завершена",
  paused: "Приостановлена",
  cancelled: "Отменена",
};

/** Классы бейджа статуса (bg/text), согласованы с токенами темы. */
export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  new: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/15 text-primary",
  review: "bg-warning/15 text-warning",
  awaiting_decision: "bg-accent text-accent-foreground",
  completed: "bg-success/15 text-success",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочно",
};

export const TASK_PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export const UPDATE_STATUS_LABELS: Record<UpdateStatus, string> = {
  pending: "На проверке",
  approved: "Принято",
  rejected: "Отклонено",
};

export const UPDATE_STATUS_BADGE: Record<UpdateStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pending: "Ожидает решения",
  decided: "Решено",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Активен",
  archived: "В архиве",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: "Новая задача",
  update_submitted: "Обновление на модерацию",
  update_approved: "Обновление принято",
  update_rejected: "Обновление отклонено",
  decision_requested: "Требуется решение",
  decision_made: "Решение принято",
  deadline_soon: "Приближается дедлайн",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  task_created: "Задача создана",
  status_changed: "Статус изменён",
  progress_changed: "Прогресс обновлён",
  update_approved: "Обновление принято",
  decision_requested: "Запрошено решение директора",
  decision_made: "Директор принял решение",
  task_completed: "Задача завершена",
};
