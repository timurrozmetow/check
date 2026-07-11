import { t, type Locale } from "../../shared/i18n";
import type { TaskStatus } from "../../shared/constants";

/** Локализованное название статуса задачи для отчёта. */
export function taskStatusLabel(status: TaskStatus, locale: Locale): string {
  return t(locale, `taskStatus.${status}`);
}

/** Локализованное название события хронологии для отчёта. */
export function activityLabel(type: string, locale: Locale): string {
  return t(locale, `activity.${type}`);
}
