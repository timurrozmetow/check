import { z } from "zod";
import { PROGRESS_STEP } from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const taskIdParamSchema = z.object({
  taskId: z.coerce.number().int().positive(),
});

export const createUpdateSchema = z.object({
  text: z.string().min(3, "Слишком короткое сообщение").max(5000),
});

export const approveSchema = z.object({
  progress: z
    .number()
    .int()
    .min(0)
    .max(100)
    .refine((v) => v % PROGRESS_STEP === 0, {
      message: `Прогресс должен быть кратен ${PROGRESS_STEP}`,
    })
    .optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(3, "Укажите причину отклонения").max(1000),
});
