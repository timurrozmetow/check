import { api, apiDownload, RequestError, tryRefresh } from "./client";
import { useAuthStore } from "@/stores/auth";
import i18n from "@/i18n";
import type { FileEntityType, FileInfo, User } from "./types";

const BASE = "/api/v1";

/** Язык интерфейса для заголовка X-Lang (как в client.ts). */
function langHeader(): string {
  return i18n.language?.startsWith("tr") ? "tr" : "ru";
}

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

/**
 * Загрузка файлов с прогрессом отправки. fetch не умеет отдавать прогресс
 * upload'а, поэтому здесь XMLHttpRequest — единственный, кто даёт
 * `upload.onprogress`. onProgress получает целые проценты 0..100.
 * При 401 один раз обновляет access-токен и повторяет запрос — как api().
 */
export function uploadFilesWithProgress(
  entityType: FileEntityType,
  entityId: number,
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<FileInfo[]> {
  const send = (canRetry: boolean): Promise<FileInfo[]> =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("entityType", entityType);
      fd.append("entityId", String(entityId));
      for (const f of files) fd.append("file", f);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/files`);
      xhr.withCredentials = true; // cookie (refresh) — как credentials: "include"
      const token = useAuthStore.getState().accessToken;
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("X-Lang", langHeader());
      // Content-Type НЕ ставим — браузер сам добавит multipart boundary.

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = async () => {
        // 401 → пробуем обновить токен и повторить ровно один раз.
        if (xhr.status === 401 && canRetry) {
          if (await tryRefresh()) {
            resolve(send(false));
          } else {
            useAuthStore.getState().clear();
            reject(new RequestError(401, "UNAUTHORIZED", "Сессия истекла"));
          }
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { files: FileInfo[] };
            if (onProgress) onProgress(100);
            resolve(data.files);
          } catch {
            reject(
              new RequestError(xhr.status, "PARSE_ERROR", "Некорректный ответ сервера"),
            );
          }
          return;
        }
        // Ошибка — вытаскиваем код/сообщение из единого формата { error }.
        let code = "ERROR";
        let message = `Ошибка запроса (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText) as {
            error: { code: string; message: string };
          };
          code = data.error.code;
          message = data.error.message;
        } catch {
          /* не-JSON ответ — оставляем дефолт */
        }
        reject(new RequestError(xhr.status, code, message));
      };

      xhr.onerror = () =>
        reject(new RequestError(0, "NETWORK", "Сетевая ошибка при загрузке"));
      xhr.onabort = () =>
        reject(new RequestError(0, "ABORTED", "Загрузка прервана"));

      xhr.send(fd);
    });

  return send(true);
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
