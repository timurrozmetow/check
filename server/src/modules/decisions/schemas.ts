import { z } from "zod";
import { DECISION_STATUSES, DECISION_TYPES } from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createDecisionSchema = z.object({
  taskId: z.number().int().positive(),
  title: z
    .string()
    .min(1, "Укажите заголовок")
    .max(200, "Заголовок не длиннее 200 символов"),
  description: z.string().optional(),
  type: z.enum(DECISION_TYPES),
  options: z
    .array(
      z.object({
        title: z
          .string()
          .min(1, "Укажите название варианта")
          .max(200, "Название варианта не длиннее 200 символов"),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;

export const listDecisionsQuerySchema = z.object({
  status: z.enum(DECISION_STATUSES).optional(),
});

export const decideSchema = z.object({
  optionId: z.number().int().positive().optional(),
  approved: z.boolean().optional(),
  comment: z.string().optional(),
});

export type DecideInput = z.infer<typeof decideSchema>;
