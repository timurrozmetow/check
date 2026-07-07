const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** «Июль 2026». month: 1..12 */
export function monthYearNominative(month: number, year: number): string {
  return `${MONTHS_NOMINATIVE[month - 1]} ${year}`;
}

/** «за июль 2026 года». month: 1..12 */
export function monthYearGenitive(month: number, year: number): string {
  return `за ${MONTHS_GENITIVE[month - 1]} ${year} года`;
}

/** «07.07.2026» */
export function formatDateRu(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}

/** «7 июля 2026, 18:00» */
export function formatDateTimeRu(date: Date): string {
  const d = date.getDate();
  const m = MONTHS_GENITIVE[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${m} ${date.getFullYear()}, ${hh}:${mm}`;
}

/** «5 дн. 3 ч.» из миллисекунд. */
export function formatDurationRu(ms: number): string {
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${Math.max(hours, 1)} ч.`;
  return hours > 0 ? `${days} дн. ${hours} ч.` : `${days} дн.`;
}
