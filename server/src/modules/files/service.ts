import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index";
import {
  decisionOptions,
  decisionRequests,
  files,
  taskUpdates,
  tasks,
  type FileRow,
} from "../../db/schema";
import {
  ALLOWED_MIME_TYPES,
  IMAGE_MIME_TYPES,
  type FileEntityType,
  type Role,
} from "../../shared/constants";
import { env } from "../../shared/env";
import { fileRowToInfo, type FileInfo } from "../../shared/file-info";
import { badRequest, forbidden, notFound } from "../../shared/errors";

const uploadsRoot = path.resolve(env.UPLOADS_DIR);

/** Проверяет существование сущности и право текущего пользователя прикреплять к ней файлы. */
async function assertCanAttach(
  entityType: FileEntityType,
  entityId: number,
  role: Role,
  userId: number,
): Promise<void> {
  if (entityType === "task_update") {
    const [upd] = await db
      .select({ authorId: taskUpdates.authorId, status: taskUpdates.status })
      .from(taskUpdates)
      .where(eq(taskUpdates.id, entityId))
      .limit(1);
    if (!upd) throw notFound("Обновление не найдено");
    if (role === "admin") return;
    if (upd.authorId === userId && upd.status === "pending") return;
    throw forbidden("Нельзя прикрепить файл к этому обновлению");
  }

  // task / decision_request / decision_option — только admin
  if (role !== "admin") throw forbidden("Недостаточно прав");

  let exists = false;
  if (entityType === "task") {
    const [row] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, entityId))
      .limit(1);
    exists = Boolean(row);
  } else if (entityType === "decision_request") {
    const [row] = await db
      .select({ id: decisionRequests.id })
      .from(decisionRequests)
      .where(eq(decisionRequests.id, entityId))
      .limit(1);
    exists = Boolean(row);
  } else {
    const [row] = await db
      .select({ id: decisionOptions.id })
      .from(decisionOptions)
      .where(eq(decisionOptions.id, entityId))
      .limit(1);
    exists = Boolean(row);
  }
  if (!exists) throw notFound("Объект для прикрепления не найден");
}

interface SavedFile {
  relPath: string;
  thumbRelPath: string | null;
  mime: string;
  size: number;
  originalName: string;
}

interface IncomingFile {
  filename: string;
  mimetype: string;
  file: NodeJS.ReadableStream & { truncated: boolean };
}

/** Сохраняет один файл на диск, генерит превью для изображений. */
async function saveOne(part: IncomingFile): Promise<SavedFile> {
  const mime = part.mimetype;
  const expectedExt = ALLOWED_MIME_TYPES[mime];
  const actualExt = path.extname(part.filename).toLowerCase();
  if (!expectedExt || (expectedExt !== actualExt && !isExtCompatible(mime, actualExt))) {
    // сливаем поток, чтобы multipart не завис
    part.file.resume();
    throw badRequest("Недопустимый тип файла", "UNSUPPORTED_TYPE");
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.join(uploadsRoot, year, month);
  await fs.mkdir(dir, { recursive: true });

  const uuid = randomUUID();
  const ext = expectedExt;
  const fileName = `${uuid}${ext}`;
  const fullPath = path.join(dir, fileName);
  const relPath = `${year}/${month}/${fileName}`;

  await pipeline(part.file, createWriteStream(fullPath));

  if (part.file.truncated) {
    await fs.unlink(fullPath).catch(() => {});
    throw badRequest("Файл превышает допустимый размер", "FILE_TOO_LARGE");
  }

  const stat = await fs.stat(fullPath);

  let thumbRelPath: string | null = null;
  if (IMAGE_MIME_TYPES.includes(mime)) {
    const thumbName = `thumb_${uuid}.webp`;
    const thumbFull = path.join(dir, thumbName);
    try {
      await sharp(fullPath)
        .resize({ width: 480, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbFull);
      thumbRelPath = `${year}/${month}/${thumbName}`;
    } catch {
      thumbRelPath = null;
    }
  }

  return {
    relPath,
    thumbRelPath,
    mime,
    size: stat.size,
    originalName: part.filename,
  };
}

function isExtCompatible(mime: string, ext: string): boolean {
  // jpg/jpeg оба валидны для image/jpeg
  if (mime === "image/jpeg") return ext === ".jpg" || ext === ".jpeg";
  return false;
}

export async function saveFiles(
  entityType: FileEntityType,
  entityId: number,
  saved: SavedFile[],
  uploadedBy: number,
): Promise<FileInfo[]> {
  if (saved.length === 0) return [];
  await db.insert(files).values(
    saved.map((s) => ({
      entityType,
      entityId,
      path: s.relPath,
      thumbPath: s.thumbRelPath,
      mime: s.mime,
      size: s.size,
      originalName: s.originalName,
      uploadedBy,
    })),
  );
  // Вернём только что вставленные
  const rows = await db
    .select()
    .from(files)
    .where(and(eq(files.entityType, entityType), eq(files.entityId, entityId)));
  const savedPaths = new Set(saved.map((s) => s.relPath));
  return rows
    .filter((r: FileRow) => savedPaths.has(r.path))
    .map(fileRowToInfo);
}

export { assertCanAttach, saveOne };
export type { SavedFile, IncomingFile };

export async function deleteFile(
  fileId: number,
  role: Role,
  userId: number,
): Promise<void> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!file) throw notFound("Файл не найден");

  if (role !== "admin") {
    // Разрешаем удалять только автору вложения к pending-обновлению
    if (file.entityType !== "task_update" || file.uploadedBy !== userId) {
      throw forbidden("Недостаточно прав");
    }
    const [upd] = await db
      .select({ status: taskUpdates.status })
      .from(taskUpdates)
      .where(eq(taskUpdates.id, file.entityId))
      .limit(1);
    if (!upd || upd.status !== "pending") {
      throw forbidden("Обновление уже промодерировано");
    }
  }

  await db.delete(files).where(eq(files.id, fileId));
  await fs.unlink(path.join(uploadsRoot, file.path)).catch(() => {});
  if (file.thumbPath) {
    await fs.unlink(path.join(uploadsRoot, file.thumbPath)).catch(() => {});
  }
}
