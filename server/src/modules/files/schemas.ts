import { z } from "zod";
import { FILE_ENTITY_TYPES } from "../../shared/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const uploadFieldsSchema = z.object({
  entityType: z.enum(FILE_ENTITY_TYPES),
  entityId: z.coerce.number().int().positive(),
});
