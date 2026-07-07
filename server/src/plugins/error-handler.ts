import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";

export default fp(async (app) => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    }

    if (err instanceof ZodError) {
      const first = err.errors[0];
      const message = first
        ? `${first.path.join(".")}: ${first.message}`
        : "Некорректные данные";
      return reply
        .status(400)
        .send({ error: { code: "VALIDATION_ERROR", message } });
    }

    // Ошибки fastify с кодом (rate-limit, multipart и т.п.)
    const status = err.statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMITED",
          message: "Слишком много запросов, попробуйте позже",
        },
      });
    }
    if (status === 413) {
      return reply.status(413).send({
        error: { code: "FILE_TOO_LARGE", message: "Файл слишком большой" },
      });
    }

    if (status >= 500) {
      req.log.error(err);
      return reply.status(500).send({
        error: { code: "INTERNAL", message: "Внутренняя ошибка сервера" },
      });
    }

    return reply
      .status(status)
      .send({ error: { code: err.code ?? "ERROR", message: err.message } });
  });

  app.setNotFoundHandler((req, reply) => {
    reply
      .status(404)
      .send({ error: { code: "NOT_FOUND", message: "Маршрут не найден" } });
  });
});
