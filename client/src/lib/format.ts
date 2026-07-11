import { format, formatDistanceToNow, isPast } from "date-fns";
import { ru, tr } from "date-fns/locale";
import i18n from "@/i18n";

/** Локаль date-fns под текущий язык интерфейса. */
function dfLocale() {
  return i18n.language?.startsWith("tr") ? tr : ru;
}

/** «7 июля 2026» / «7 Temmuz 2026» */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMMM yyyy", { locale: dfLocale() });
}

/** «7 июля, 18:00» / «7 Temmuz, 18:00» */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMMM, HH:mm", { locale: dfLocale() });
}

/** «через 3 дня» / «3 gün içinde» */
export function formatRelative(iso: string | null): string {
  if (!iso) return "";
  return formatDistanceToNow(new Date(iso), {
    locale: dfLocale(),
    addSuffix: true,
  });
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
