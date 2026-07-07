import path from "node:path";
import fs from "node:fs";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { env, isProd } from "./shared/env";
import authPlugin from "./plugins/auth";
import errorHandler from "./plugins/error-handler";
import authRoutes from "./modules/auth/routes";
import usersRoutes from "./modules/users/routes";
import projectsRoutes from "./modules/projects/routes";
import tasksRoutes from "./modules/tasks/routes";
import updatesRoutes from "./modules/updates/routes";
import decisionsRoutes from "./modules/decisions/routes";
import filesRoutes from "./modules/files/routes";
import notificationsRoutes from "./modules/notifications/routes";
import reportsRoutes from "./modules/reports/routes";

export async function buildApp() {
  const app = Fastify({
    logger: isProd
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        },
    bodyLimit: 1024 * 1024, // JSON-тела; файлы идут через multipart со своим лимитом
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });
  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
      files: 10,
    },
  });

  // Раздача загруженных файлов (в проде это делает Nginx)
  const uploadsRoot = path.resolve(env.UPLOADS_DIR);
  fs.mkdirSync(uploadsRoot, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/uploads/",
    decorateReply: false,
  });

  await app.register(errorHandler);
  await app.register(authPlugin);

  app.get("/api/v1/health", async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(usersRoutes, { prefix: "/api/v1/users" });
  await app.register(projectsRoutes, { prefix: "/api/v1/projects" });
  await app.register(tasksRoutes, { prefix: "/api/v1/tasks" });
  await app.register(updatesRoutes, { prefix: "/api/v1/updates" });
  await app.register(decisionsRoutes, { prefix: "/api/v1/decisions" });
  await app.register(filesRoutes, { prefix: "/api/v1/files" });
  await app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await app.register(reportsRoutes, { prefix: "/api/v1/reports" });

  return app;
}
