import { z } from "zod";
import {
  PROGRESS_STEP,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTasksQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
});

const deadlineSchema = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .or(z.string().length(0).transform(() => null));

export const createTaskSchema = z.object({
  title: z.string().min(1, "validation.titleRequired").max(200),
  description: z.string().optional(),
  projectId: z.number().int().positive(),
  assigneeIds: z.array(z.number().int().positive()).default([]),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  deadline: deadlineSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    projectId: z.number().int().positive().optional(),
    assigneeIds: z.array(z.number().int().positive()).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    deadline: deadlineSchema,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "validation.noFieldsToUpdate",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const updateProgressSchema = z.object({
  progress: z
    .number()
    .int()
    .min(0)
    .max(100)
    .refine((v) => v % PROGRESS_STEP === 0, {
      message: "validation.progressStep",
    }),
});
