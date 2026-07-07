import type { FastifyInstance } from "fastify";
import {
  createUserSchema,
  idParamSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "./schemas";
import { createUser, listUsers, resetPassword, updateUser } from "./service";

export default async function usersRoutes(app: FastifyInstance) {
  // Весь модуль — только для админа
  app.addHook("preHandler", app.requireRole("admin"));

  app.get("/", async () => ({ users: await listUsers() }));

  app.post("/", async (req) => {
    const input = createUserSchema.parse(req.body);
    return { user: await createUser(input) };
  });

  app.patch("/:id", async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    return { user: await updateUser(id, input, req.user.sub) };
  });

  app.post("/:id/reset-password", async (req) => {
    const { id } = idParamSchema.parse(req.params);
    const { password } = resetPasswordSchema.parse(req.body);
    await resetPassword(id, password);
    return { ok: true };
  });
}
