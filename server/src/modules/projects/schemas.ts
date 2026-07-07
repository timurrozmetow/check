import { z } from "zod";
import { PROJECT_STATUSES } from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #rrggbb");

export const createProjectSchema = z.object({
  name: z.string().min(1, "Укажите название").max(160),
  description: z.string().optional(),
  color: colorSchema.optional(),
  icon: z.string().max(40).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    description: z.string().nullable().optional(),
    color: colorSchema.optional(),
    icon: z.string().max(40).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Нет полей для обновления",
  });

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
