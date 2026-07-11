import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../shared/errors";
import { resolveLocale, hasKey, t, type Locale } from "../shared/i18n";

declare module "fastify" {
  interface FastifyRequest {
    locale: Locale;
  }
}

export default fp(async (app) => {
  // Локаль запроса из X-Lang (фолбэк Accept-Language), по умолчанию ru.
  app.decorateRequest("locale", "ru");
  app.addHook("onRequest", (req, _reply, done) => {
    req.locale = resolveLocale(
      (req.headers["x-lang"] as string | undefined) ??
        req.headers["accept-language"],
    );
    done();
  });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const locale = req.locale ?? "ru";

    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.localized(locale) } });
    }

    if (err instanceof ZodError) {
      const first = err.errors[0];
      const key = first?.message;
      const message =
        key && hasKey(key) ? t(locale, key) : t(locale, "error.validation");
      return reply
        .status(400)
        .send({ error: { code: "VALIDATION_ERROR", message } });
    }

    // Ошибки fastify с кодом (rate-limit, multipart и т.п.)
    const status = err.statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: t(locale, "error.rateLimited") },
      });
    }
    if (status === 413) {
      return reply.status(413).send({
        error: {
          code: "FILE_TOO_LARGE",
          message: t(locale, "error.fileTooLarge"),
        },
      });
    }

    if (status >= 500) {
      req.log.error(err);
      return reply.status(500).send({
        error: { code: "INTERNAL", message: t(locale, "error.internal") },
      });
    }

    return reply
      .status(status)
      .send({ error: { code: err.code ?? "ERROR", message: err.message } });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: t(req.locale ?? "ru", "error.routeNotFound"),
      },
    });
  });
});
