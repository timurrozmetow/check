import type { TaskStatus } from "../../shared/constants";

/** Русские названия статусов для отчёта. */
export const TASK_STATUS_LABELS_RU: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  awaiting_decision: "Ждёт решения",
  completed: "Завершена",
  paused: "Приостановлена",
  cancelled: "Отменена",
};

/** Русские названия событий хронологии. */
export const ACTIVITY_LABELS_RU: Record<string, string> = {
  task_created: "Задача создана",
  status_changed: "Статус изменён",
  progress_changed: "Прогресс обновлён",
  update_approved: "Обновление принято",
  decision_requested: "Запрошено решение директора",
  decision_made: "Директор принял решение",
  task_completed: "Задача завершена",
};
