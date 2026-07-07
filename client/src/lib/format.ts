import { format, formatDistanceToNow, isPast } from "date-fns";
import { ru } from "date-fns/locale";

/** «7 июля 2026» */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMMM yyyy", { locale: ru });
}

/** «7 июля, 18:00» */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMMM, HH:mm", { locale: ru });
}

/** «через 3 дня» / «2 дня назад» */
export function formatRelative(iso: string | null): string {
  if (!iso) return "";
  return formatDistanceToNow(new Date(iso), { locale: ru, addSuffix: true });
}

/** Просрочен ли дедлайн. */
export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return isPast(new Date(iso));
}

/** Инициалы из имени: «Иван Петров» → «ИП». */
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
