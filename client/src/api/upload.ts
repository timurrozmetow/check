import { api, apiDownload } from "./client";
import type { FileEntityType, FileInfo, User } from "./types";

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
  const res = await api<{ files: FileInfo[] }>("/files", {
    method: "POST",
    formData: fd,
  });
  return res.files;
}

export async function deleteFile(id: number): Promise<void> {
  await api(`/files/${id}`, { method: "DELETE" });
}

/**
 * Скачивает файл через API под токеном (attachment) — надёжнее прямой ссылки
 * на /uploads: корректное имя файла и понятная ошибка вместо «файл недоступен».
 */
export function downloadFile(id: number, filename: string): Promise<void> {
  return apiDownload(`/files/${id}/download`, filename);
}

/** Загружает аватар текущего пользователя, возвращает обновлённый профиль. */
export async function uploadAvatar(file: File): Promise<User> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api<{ user: User }>("/auth/avatar", {
    method: "POST",
    formData: fd,
  });
  return res.user;
}

/** Убирает аватар текущего пользователя. */
export async function removeAvatar(): Promise<User> {
  const res = await api<{ user: User }>("/auth/avatar", { method: "DELETE" });
  return res.user;
}
