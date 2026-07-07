import type { FastifyInstance } from "fastify";
import {
  createTaskSchema,
  idParamSchema,
  listTasksQuerySchema,
  updateProgressSchema,
  updateStatusSchema,
  updateTaskSchema,
} from "./schemas";
import {
  changeProgress,
  changeStatus,
  createTask,
  deleteTask,
  getTaskDetail,
  getTimeline,
  listTasks,
  updateTask,
} from "./service";

export default async function tasksRoutes(app: FastifyInstance) {
  // GET /api/v1/tasks — все роли (видимость внутри сервиса)
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const filters = listTasksQuerySchema.parse(req.query);
    return {
      tasks: await listTasks(req.user.role, req.user.sub, filters),
    };
  });

  // GET /api/v1/tasks/:id
  app.get("/:id", { preHandler: [app.authenticate] }, async (req) => {
    const { id } = idParamSchema.parse(req.params);
    return {
      task: await getTaskDetail(id, req.user.role, req.user.sub),
    };
  });

  // GET /api/v1/tasks/:id/timeline
  app.get("/:id/timeline", { preHandler: [app.authenticate] }, async (req) => {
    const { id } = idParamSchema.parse(req.params);
    return {
      events: await getTimeline(id, req.user.role, req.user.sub),
    };
  });

  // POST /api/v1/tasks — admin
  app.post("/", { preHandler: [app.requireRole("admin")] }, async (req) => {
    const input = createTaskSchema.parse(req.body);
    return { task: await createTask(input, req.user.sub) };
  });

  // PATCH /api/v1/tasks/:id — admin
  app.patch("/:id", { preHandler: [app.requireRole("admin")] }, async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateTaskSchema.parse(req.body);
    return { task: await updateTask(id, input, req.user.sub) };
  });

  // PATCH /api/v1/tasks/:id/status — admin
  app.patch(
    "/:id/status",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      const { status } = updateStatusSchema.parse(req.body);
      return { task: await changeStatus(id, status, req.user.sub) };
    },
  );

  // PATCH /api/v1/tasks/:id/progress — admin
  app.patch(
    "/:id/progress",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      const { progress } = updateProgressSchema.parse(req.body);
      return { task: await changeProgress(id, progress, req.user.sub) };
    },
  );

  // DELETE /api/v1/tasks/:id — admin
  app.delete(
    "/:id",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      await deleteTask(id);
      return { ok: true };
    },
  );
}
