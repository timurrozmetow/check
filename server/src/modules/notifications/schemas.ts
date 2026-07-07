import { z } from "zod";

/** Query-параметры GET /notifications. */
export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ListNotificationsQuery = z.output<
  typeof listNotificationsQuerySchema
>;

/** Тело POST /notifications/read. Без ids — пометить все свои. */
export const markReadSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).optional(),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
