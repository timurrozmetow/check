import ru from "./ru.json";
import tr from "./tr.json";

export type Locale = "ru" | "tr";
export const LOCALES: readonly Locale[] = ["ru", "tr"];

const catalogs: Record<Locale, unknown> = { ru, tr };

/** Определяет локаль по заголовку (X-Lang / Accept-Language). По умолчанию ru. */
export function resolveLocale(header?: string | string[] | undefined): Locale {
  const h = Array.isArray(header) ? header[0] : header;
  const base = (h ?? "").trim().slice(0, 2).toLowerCase();
  return base === "tr" ? "tr" : "ru";
}

/** Достаёт строку по вложенному ключу «a.b.c». */
function lookup(cat: unknown, key: string): string | undefined {
  let cur: unknown = cat;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Есть ли такой ключ в каталоге (по ru как эталону). */
export function hasKey(key: string): boolean {
  return lookup(catalogs.ru, key) !== undefined;
}

/**
 * Перевод по ключу в заданной локали. Фолбэк: локаль → ru → сам ключ.
 * Интерполяция {{name}}.
 */
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  let s = lookup(catalogs[locale], key) ?? lookup(catalogs.ru, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
    }
  }
  return s;
}
