import { t, type Locale } from "./i18n";

type Params = Record<string, string | number>;

/**
 * Ошибка приложения с машинным кодом и ключом локализации.
 * Глобальный error handler рендерит сообщение в локали запроса:
 * { error: { code, message } }. Если key не найден в каталоге —
 * он отображается как есть (обратная совместимость со старым текстом).
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly key: string,
    public readonly params?: Params,
  ) {
    super(t("ru", key, params)); // для логов
    this.name = "AppError";
  }

  localized(locale: Locale): string {
    return t(locale, this.key, this.params);
  }
}

export const notFound = (key = "error.notFound", params?: Params) =>
  new AppError(404, "NOT_FOUND", key, params);

export const forbidden = (key = "error.forbidden", params?: Params) =>
  new AppError(403, "FORBIDDEN", key, params);

export const badRequest = (key: string, code = "BAD_REQUEST", params?: Params) =>
  new AppError(400, code, key, params);

export const unauthorized = (key = "error.unauthorized", params?: Params) =>
  new AppError(401, "UNAUTHORIZED", key, params);
