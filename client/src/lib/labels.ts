import type { TaskPriority, TaskStatus, UpdateStatus } from "@/api/types";

/**
 * CSS-классы бейджей (bg/text), согласованы с токенами темы.
 * Текстовые подписи статусов/ролей/типов — в i18n-ресурсах (t("taskStatus.…") и т.д.).
 */

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  new: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/15 text-primary",
  review: "bg-warning/15 text-warning",
  awaiting_decision: "bg-accent text-accent-foreground",
  completed: "bg-success/15 text-success",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const TASK_PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

export const UPDATE_STATUS_BADGE: Record<UpdateStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};
