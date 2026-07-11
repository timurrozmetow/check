import type { FastifyInstance } from "fastify";
import { FILE_ENTITY_TYPES, type FileEntityType } from "../../shared/constants";
import { badRequest } from "../../shared/errors";
import { idParamSchema } from "./schemas";
import {
  assertCanAttach,
  deleteFile,
  saveFiles,
  saveOne,
  type SavedFile,
} from "./service";

export default async function filesRoutes(app: FastifyInstance) {
  // POST /api/v1/files — multipart: сначала поля entityType/entityId, затем файлы
  app.post("/", { preHandler: [app.authenticate] }, async (req) => {
    if (!req.isMultipart()) {
      throw badRequest("error.multipartExpected");
    }

    let entityType: FileEntityType | undefined;
    let entityId: number | undefined;
    let authChecked = false;
    const saved: SavedFile[] = [];

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "field") {
        if (part.fieldname === "entityType") {
          const value = String(part.value);
          if (!FILE_ENTITY_TYPES.includes(value as FileEntityType)) {
            throw badRequest("error.invalidEntityType");
          }
          entityType = value as FileEntityType;
        } else if (part.fieldname === "entityId") {
          entityId = Number(part.value);
        }
      } else {
        // файл
        if (entityType === undefined || !entityId) {
          part.file.resume();
          throw badRequest("error.fieldsBeforeFiles");
        }
        if (!authChecked) {
          await assertCanAttach(
            entityType,
            entityId,
            req.user.role,
            req.user.sub,
          );
          authChecked = true;
        }
        saved.push(await saveOne(part));
      }
    }

    if (entityType === undefined || !entityId) {
      throw badRequest("error.entityFieldsMissing");
    }
    if (saved.length === 0) {
      throw badRequest("error.filesMissing");
    }

    const result = await saveFiles(
      entityType,
      entityId,
      saved,
      req.user.sub,
    );
    return { files: result };
  });

  // DELETE /api/v1/files/:id
  app.delete("/:id", { preHandler: [app.authenticate] }, async (req) => {
    const { id } = idParamSchema.parse(req.params);
    await deleteFile(id, req.user.role, req.user.sub);
    return { ok: true };
  });
}
