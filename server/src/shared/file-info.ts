import { and, eq, inArray } from "drizzle-orm";
import { files, type FileRow } from "../db/schema";
import type { Db, Tx } from "../db/index";
import type { FileEntityType } from "./constants";

/** DTO файла, отдаваемый клиенту. */
export interface FileInfo {
  id: number;
  entityType: FileEntityType;
  entityId: number;
  url: string;
  thumbUrl: string | null;
  mime: string;
  size: number;
  originalName: string;
  createdAt: Date;
}

export function fileRowToInfo(row: FileRow): FileInfo {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    url: `/uploads/${row.path}`,
    thumbUrl: row.thumbPath ? `/uploads/${row.thumbPath}` : null,
    mime: row.mime,
    size: row.size,
    originalName: row.originalName,
    createdAt: row.createdAt,
  };
}

/**
 * Загружает файлы для набора сущностей одного типа.
 * Возвращает Map entityId → FileInfo[].
 */
export async function getFilesFor(
  dbOrTx: Db | Tx,
  entityType: FileEntityType,
  entityIds: number[],
): Promise<Map<number, FileInfo[]>> {
  const result = new Map<number, FileInfo[]>();
  if (entityIds.length === 0) return result;

  const rows = await dbOrTx
    .select()
    .from(files)
    .where(
      and(eq(files.entityType, entityType), inArray(files.entityId, entityIds)),
    );

  for (const row of rows) {
    const list = result.get(row.entityId) ?? [];
    list.push(fileRowToInfo(row));
    result.set(row.entityId, list);
  }
  return result;
}
