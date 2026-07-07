/**
 * Ошибка приложения с машинным кодом. Глобальный error handler
 * превращает её в ответ вида { error: { code, message } }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (message = "Не найдено") =>
  new AppError(404, "NOT_FOUND", message);

export const forbidden = (message = "Недостаточно прав") =>
  new AppError(403, "FORBIDDEN", message);

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new AppError(400, code, message);

export const unauthorized = (message = "Требуется авторизация") =>
  new AppError(401, "UNAUTHORIZED", message);
