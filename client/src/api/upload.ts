import { api } from "./client";
import type { FileEntityType, FileInfo } from "./types";

/** Загружает файлы к сущности через multipart. */
export async function uploadFiles(
  entityType: FileEntityType,
  entityId: number,
  files: File[],
): Promise<FileInfo[]> {
  const fd = new FormData();
  fd.append("entityType", entityType);
  fd.append("entityId", String(entityId));
  for (const f of files) fd.append("file", f);
  const res = await api<{ files: FileInfo[] }>("/files", { formData: fd });
  return res.files;
}

export async function deleteFile(id: number): Promise<void> {
  await api(`/files/${id}`, { method: "DELETE" });
}
