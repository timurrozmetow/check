import type { FastifyInstance } from "fastify";
import { env } from "../../shared/env";
import { addSseClient, removeSseClient } from "../../shared/sse";
import { listNotificationsQuerySchema, markReadSchema } from "./schemas";
import { listNotifications, markNotificationsRead } from "./service";

const SSE_PING_INTERVAL_MS = 30_000;

export default async function notificationsRoutes(app: FastifyInstance) {
  // GET /api/v1/notifications?unreadOnly=true|false
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const { unreadOnly } = listNotificationsQuerySchema.parse(req.query);
    return listNotifications(req.user.sub, unreadOnly);
  });

  // POST /api/v1/notifications/read
  app.post("/read", { preHandler: [app.authenticate] }, async (req) => {
    const { ids } = markReadSchema.parse(req.body ?? {});
    await markNotificationsRead(req.user.sub, ids);
    return { ok: true };
  });

  // GET /api/v1/notifications/stream?token=<accessToken> — SSE
  app.get("/stream", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": env.CORS_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });
    reply.raw.write(": connected\n\n");

    addSseClient(userId, reply);

    const ping = setInterval(() => {
      reply.raw.write(": ping\n\n");
    }, SSE_PING_INTERVAL_MS);

    req.raw.on("close", () => {
      clearInterval(ping);
      removeSseClient(userId, reply);
    });
  });
}
