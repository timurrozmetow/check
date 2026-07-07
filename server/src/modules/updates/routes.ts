import type { FastifyInstance } from "fastify";
import {
  approveSchema,
  createUpdateSchema,
  idParamSchema,
  rejectSchema,
  taskIdParamSchema,
} from "./schemas";
import {
  approveUpdate,
  createUpdate,
  listModeration,
  listMyUpdates,
  rejectUpdate,
} from "./service";

export default async function updatesRoutes(app: FastifyInstance) {
  // POST /api/v1/updates/for-task/:taskId — сотрудник (или админ) создаёт обновление
  app.post(
    "/for-task/:taskId",
    { preHandler: [app.authenticate] },
    async (req) => {
      const { taskId } = taskIdParamSchema.parse(req.params);
      const { text } = createUpdateSchema.parse(req.body);
      return {
        update: await createUpdate(taskId, text, req.user.role, req.user.sub),
      };
    },
  );

  // GET /api/v1/updates/moderation — admin
  app.get(
    "/moderation",
    { preHandler: [app.requireRole("admin")] },
    async () => ({ updates: await listModeration() }),
  );

  // GET /api/v1/updates/my — сотрудник
  app.get("/my", { preHandler: [app.authenticate] }, async (req) => ({
    updates: await listMyUpdates(req.user.sub),
  }));

  // POST /api/v1/updates/:id/approve — admin
  app.post(
    "/:id/approve",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      const { progress } = approveSchema.parse(req.body ?? {});
      return { update: await approveUpdate(id, req.user.sub, progress) };
    },
  );

  // POST /api/v1/updates/:id/reject — admin
  app.post(
    "/:id/reject",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      const { reason } = rejectSchema.parse(req.body);
      return { update: await rejectUpdate(id, req.user.sub, reason) };
    },
  );
}
