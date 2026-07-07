import type { FastifyInstance } from "fastify";
import {
  createDecisionSchema,
  decideSchema,
  idParamSchema,
  listDecisionsQuerySchema,
} from "./schemas";
import {
  createDecision,
  decideDecision,
  getDecision,
  listDecisions,
} from "./service";

export default async function decisionsRoutes(app: FastifyInstance) {
  // GET /api/v1/decisions?status=pending|decided — admin и director
  app.get(
    "/",
    { preHandler: [app.requireRole("admin", "director")] },
    async (req) => {
      const { status } = listDecisionsQuerySchema.parse(req.query);
      return { requests: await listDecisions(status) };
    },
  );

  // GET /api/v1/decisions/:id
  app.get(
    "/:id",
    { preHandler: [app.requireRole("admin", "director")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      return { request: await getDecision(id) };
    },
  );

  // POST /api/v1/decisions — только admin
  app.post("/", { preHandler: [app.requireRole("admin")] }, async (req) => {
    const input = createDecisionSchema.parse(req.body);
    return { request: await createDecision(input, req.user.sub) };
  });

  // POST /api/v1/decisions/:id/decide — только director
  app.post(
    "/:id/decide",
    { preHandler: [app.requireRole("director")] },
    async (req) => {
      const { id } = idParamSchema.parse(req.params);
      const input = decideSchema.parse(req.body ?? {});
      return { request: await decideDecision(id, input, req.user.sub) };
    },
  );
}
