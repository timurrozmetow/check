import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("validation.emailInvalid"),
  password: z.string().min(1, "validation.passwordRequired"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.currentPasswordRequired"),
  newPassword: z.string().min(8, "validation.passwordMin"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
