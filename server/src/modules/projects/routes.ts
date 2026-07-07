import type { FastifyInstance } from "fastify";
import {
  createProjectSchema,
  idParamSchema,
  updateProjectSchema,
} from "./schemas";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "./service";

export default async function projectsRoutes(app: FastifyInstance) {
  // GET /api/v1/projects — все роли (видимость внутри сервиса)
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    return { projects: await listProjects(req.user.role, req.user.sub) };
  });

  // POST /api/v1/projects — admin
  app.post("/", { preHandler: [app.requireRole("admin")] }, async (req) => {
    const input = createProjectSchema.parse(req.body);
    return { project: await createProject(input) };
  });

  // PATCH /api/v1/projects/:id — admin
  app.patch("/:id", { preHandler: [app.requireRole("admin")] }, async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateProjectSchema.parse(req.body);
    return { project: await updateProject(id, input) };
  });

  // DELETE /api/v1/projects/:id — admin
  app.delete(
    "/:id",
    { preHandler: [app.requireRole("admin")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      await deleteProject(id);
      return { ok: true };
    },
  );
}
