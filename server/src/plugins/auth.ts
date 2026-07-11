import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../shared/env";
import { forbidden, unauthorized } from "../shared/errors";
import type { Role } from "../shared/constants";

export interface JwtPayload {
  sub: number;
  role: Role;
  name: string;
  type: "access" | "refresh";
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: Role[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "refresh_token", signed: false },
  });

  app.decorate("authenticate", async (req: FastifyRequest) => {
    try {
      // SSE (EventSource) не умеет ставить заголовки — разрешаем токен в query
      // ТОЛЬКО для стрима уведомлений, чтобы access-JWT не попадал в URL/логи
      // остальных запросов.
      const isSseStream =
        typeof req.url === "string" &&
        (req.url.split("?")[0] ?? "").endsWith("/notifications/stream");
      const q = req.query as Record<string, unknown> | undefined;
      if (
        isSseStream &&
        !req.headers.authorization &&
        typeof q?.token === "string"
      ) {
        req.headers.authorization = `Bearer ${q.token}`;
      }
      await req.jwtVerify();
    } catch {
      throw unauthorized();
    }
    if (req.user.type !== "access") {
      throw unauthorized("error.invalidTokenType");
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(req, reply);
      if (!roles.includes(req.user.role)) {
        throw forbidden();
      }
    };
  });
});
