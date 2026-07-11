import { z } from "zod";
import { ROLES } from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "validation.nameRequired").max(120),
  email: z.string().email("validation.emailInvalid").max(190),
  password: z.string().min(8, "validation.passwordMin"),
  role: z.enum(ROLES),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email("validation.emailInvalid").max(190).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "validation.noFieldsToUpdate",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "validation.passwordMin"),
});
