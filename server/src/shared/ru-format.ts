import type { Locale } from "./i18n";

const MONTHS_NOMINATIVE_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTHS_GENITIVE_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** «Июль 2026» / «Temmuz 2026». month: 1..12 */
export function monthYearNominative(
  month: number,
  year: number,
  locale: Locale = "ru",
): string {
  const name = locale === "tr" ? MONTHS_TR[month - 1] : MONTHS_NOMINATIVE_RU[month - 1];
  return `${name} ${year}`;
}

/** «за июль 2026 года» / «Temmuz 2026» (в турецком без склонения). month: 1..12 */
export function monthYearGenitive(
  month: number,
  year: number,
  locale: Locale = "ru",
): string {
  if (locale === "tr") return `${MONTHS_TR[month - 1]} ${year}`;
  return `за ${MONTHS_GENITIVE_RU[month - 1]} ${year} года`;
}

/** «07.07.2026» (одинаково для обеих локалей) */
export function formatDateRu(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}

/** «7 июля 2026, 18:00» / «7 Temmuz 2026, 18:00» */
export function formatDateTimeRu(date: Date, locale: Locale = "ru"): string {
  const d = date.getDate();
  const m = locale === "tr" ? MONTHS_TR[date.getMonth()] : MONTHS_GENITIVE_RU[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${m} ${date.getFullYear()}, ${hh}:${mm}`;
}

/** «5 дн. 3 ч.» / «5 gün 3 sa.» из миллисекунд. */
export function formatDurationRu(ms: number, locale: Locale = "ru"): string {
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dU = locale === "tr" ? "gün" : "дн.";
  const hU = locale === "tr" ? "sa." : "ч.";
  if (days === 0) return `${Math.max(hours, 1)} ${hU}`;
  return hours > 0 ? `${days} ${dU} ${hours} ${hU}` : `${days} ${dU}`;
}
