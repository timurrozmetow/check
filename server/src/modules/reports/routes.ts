import type { FastifyInstance } from "fastify";
import { monthlyReportQuerySchema } from "./schemas";
import { gatherReportData } from "./service";
import { buildMonthlyReport } from "./docx-builder";

export default async function reportsRoutes(app: FastifyInstance) {
  // GET /api/v1/reports/monthly?year=&month=&projectId= — admin, отдаёт .docx
  app.get(
    "/monthly",
    { preHandler: [app.requireRole("admin")] },
    async (req, reply) => {
      const { year, month, projectId } = monthlyReportQuerySchema.parse(
        req.query,
      );
      const data = await gatherReportData(year, month, projectId);
      const buffer = await buildMonthlyReport(data, req.locale);
      const filename = `report-${year}-${String(month).padStart(2, "0")}.docx`;

      reply
        .header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        .header(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
      return reply.send(buffer);
    },
  );
}
