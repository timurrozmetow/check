import { z } from "zod";

export const monthlyReportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  projectId: z.coerce.number().int().positive().optional(),
});

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
