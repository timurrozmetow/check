import type { FastifyInstance } from "fastify";
import { env, isProd } from "../../shared/env";
import { unauthorized } from "../../shared/errors";
import type { JwtPayload } from "../../plugins/auth";
import { changePasswordSchema, loginSchema } from "./schemas";
import {
  changeOwnPassword,
  getUserById,
  toPublicUser,
  verifyCredentials,
} from "./service";

const REFRESH_COOKIE = "refresh_token";

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const { email, password } = loginSchema.parse(req.body);
      const user = await verifyCredentials(email, password);

      const base = { sub: user.id, role: user.role, name: user.name };
      const accessToken = app.jwt.sign(
        { ...base, type: "access" } satisfies JwtPayload,
        { expiresIn: env.JWT_ACCESS_TTL },
      );
      const refreshToken = app.jwt.sign(
        { ...base, type: "refresh" } satisfies JwtPayload,
        { expiresIn: env.JWT_REFRESH_TTL },
      );

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/api/v1/auth",
        maxAge: 60 * 60 * 24 * 30,
      });

      return { accessToken, user: toPublicUser(user) };
    },
  );

  app.post("/refresh", async (req, reply) => {
    let payload: JwtPayload;
    try {
      payload = await req.jwtVerify<JwtPayload>({ onlyCookie: true });
    } catch {
      throw unauthorized("error.sessionExpired");
    }
    if (payload.type !== "refresh") {
      throw unauthorized("error.invalidTokenType");
    }

    const user = await getUserById(payload.sub);
    if (!user || !user.isActive) {
      throw unauthorized("error.userNotFoundOrDisabled");
    }

    const accessToken = app.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        name: user.name,
        type: "access",
      } satisfies JwtPayload,
      { expiresIn: env.JWT_ACCESS_TTL },
    );

    return { accessToken, user: toPublicUser(user) };
  });

  app.post("/logout", async (_req, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
    return { ok: true };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const user = await getUserById(req.user.sub);
    if (!user) throw unauthorized();
    return { user: toPublicUser(user) };
  });

  app.post(
    "/change-password",
    { preHandler: [app.authenticate] },
    async (req) => {
      const { currentPassword, newPassword } = changePasswordSchema.parse(
        req.body,
      );
      await changeOwnPassword(req.user.sub, currentPassword, newPassword);
      return { ok: true };
    },
  );
}
