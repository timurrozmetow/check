import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index";
import {
  decisionOptions,
  decisionRequests,
  files,
  taskAssignees,
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
    if (!upd) throw notFound("error.updateNotFound");
    if (role === "admin") return;
    if (upd.authorId === userId && upd.status === "pending") return;
    throw forbidden("error.cannotAttachFileToUpdate");
  }

  // task / decision_request / decision_option — только admin
  if (role !== "admin") throw forbidden("error.forbidden");

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
  if (!exists) throw notFound("error.attachTargetNotFound");
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
    throw badRequest("error.unsupportedFileType", "UNSUPPORTED_TYPE");
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
    throw badRequest("error.fileTooLarge", "FILE_TOO_LARGE");
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

/** Удаляет файл из uploads по url (`/uploads/<path>`) или относительному пути. */
export async function deleteUploadFile(urlOrPath: string): Promise<void> {
  const rel = urlOrPath.replace(/^\/uploads\//, "");
  if (!rel) return;
  await fs.unlink(path.join(uploadsRoot, rel)).catch(() => {});
}

/** Сводит вложение к id задачи, к которой оно в итоге относится. */
async function resolveTaskIdForFile(row: FileRow): Promise<number | null> {
  switch (row.entityType) {
    case "task":
      return row.entityId;
    case "task_update": {
      const [u] = await db
        .select({ taskId: taskUpdates.taskId })
        .from(taskUpdates)
        .where(eq(taskUpdates.id, row.entityId))
        .limit(1);
      return u?.taskId ?? null;
    }
    case "decision_request": {
      const [d] = await db
        .select({ taskId: decisionRequests.taskId })
        .from(decisionRequests)
        .where(eq(decisionRequests.id, row.entityId))
        .limit(1);
      return d?.taskId ?? null;
    }
    case "decision_option": {
      const [o] = await db
        .select({ requestId: decisionOptions.requestId })
        .from(decisionOptions)
        .where(eq(decisionOptions.id, row.entityId))
        .limit(1);
      if (!o) return null;
      const [d] = await db
        .select({ taskId: decisionRequests.taskId })
        .from(decisionRequests)
        .where(eq(decisionRequests.id, o.requestId))
        .limit(1);
      return d?.taskId ?? null;
    }
    default:
      return null;
  }
}

/**
 * Право скачать вложение = право видеть задачу, к которой оно относится
 * (та же модель, что assertAccess в модуле tasks): admin/director видят все
 * задачи, сотрудник — только назначенные ему. Без этой проверки любой
 * авторизованный пользователь мог бы перебором id качать чужие вложения (IDOR).
 * Осиротевший файл (не привязан ни к одной задаче) отдаём только admin/director.
 */
async function assertCanDownloadFile(
  row: FileRow,
  role: Role,
  userId: number,
): Promise<void> {
  if (role === "admin" || role === "director") return;

  const taskId = await resolveTaskIdForFile(row);
  if (taskId === null) throw forbidden("error.forbidden");

  const [assigned] = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(
      and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)),
    )
    .limit(1);
  if (!assigned) throw forbidden("error.forbidden");
}

/**
 * Готовит файл к скачиванию: проверяет право доступа, наличие строки и файла
 * на диске, отдаёт поток + метаданные. Скачивание под токеном (в отличие от
 * статической раздачи /uploads).
 */
export async function openFileForDownload(
  fileId: number,
  role: Role,
  userId: number,
): Promise<{
  stream: NodeJS.ReadableStream;
  mime: string;
  size: number;
  originalName: string;
}> {
  const [row] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!row) throw notFound("error.fileNotFound");

  await assertCanDownloadFile(row, role, userId);

  const abs = path.join(uploadsRoot, row.path);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat) throw notFound("error.fileNotFound");

  return {
    stream: createReadStream(abs),
    mime: row.mime,
    size: stat.size,
    originalName: row.originalName,
  };
}

/**
 * Удаляет вложения (строки в БД + файлы на диске) для набора сущностей.
 * Таблица files не связана внешним ключом с task/task_update/decision_*,
 * поэтому при удалении задачи/обновления их вложения нужно чистить явно —
 * иначе останутся «сироты» в БД и на диске.
 */
export async function deleteFilesForEntities(
  entries: { entityType: FileEntityType; entityIds: number[] }[],
): Promise<void> {
  for (const { entityType, entityIds } of entries) {
    if (entityIds.length === 0) continue;
    const where = and(
      eq(files.entityType, entityType),
      inArray(files.entityId, entityIds),
    );
    const rows = await db.select().from(files).where(where);
    if (rows.length === 0) continue;
    await db.delete(files).where(where);
    for (const f of rows) {
      await fs.unlink(path.join(uploadsRoot, f.path)).catch(() => {});
      if (f.thumbPath) {
        await fs.unlink(path.join(uploadsRoot, f.thumbPath)).catch(() => {});
      }
    }
  }
}

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
  if (!file) throw notFound("error.fileNotFound");

  if (role !== "admin") {
    // Разрешаем удалять только автору вложения к pending-обновлению
    if (file.entityType !== "task_update" || file.uploadedBy !== userId) {
      throw forbidden("error.forbidden");
    }
    const [upd] = await db
      .select({ status: taskUpdates.status })
      .from(taskUpdates)
      .where(eq(taskUpdates.id, file.entityId))
      .limit(1);
    if (!upd || upd.status !== "pending") {
      throw forbidden("error.updateAlreadyModerated");
    }
  }

  await db.delete(files).where(eq(files.id, fileId));
  await fs.unlink(path.join(uploadsRoot, file.path)).catch(() => {});
  if (file.thumbPath) {
    await fs.unlink(path.join(uploadsRoot, file.thumbPath)).catch(() => {});
  }
}
