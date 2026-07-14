import { useAuthStore } from "@/stores/auth";
import i18n from "@/i18n";
import type { ApiError, User } from "@/api/types";

const BASE = "/api/v1";

/** Текущий язык интерфейса для передачи на сервер (локализация ошибок/отчёта). */
function currentLang(): string {
  return i18n.language?.startsWith("tr") ? "tr" : "ru";
}

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

/** Пытается обновить access-токен по refresh-cookie. Один запрос на все параллельные 401. */
export async function tryRefresh(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; user: User };
      useAuthStore.getState().setAuth(data.user, data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** FormData для загрузки файлов (Content-Type не ставим). */
  formData?: FormData;
  signal?: AbortSignal;
}

async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { "X-Lang": currentLang() };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const hasBody = opts.formData !== undefined || opts.body !== undefined;
  // GET/HEAD c телом бросает TypeError ещё до отправки — если тело есть,
  // а метод не задан, это ошибка вызова: используем POST, а не молчаливый GET.
  const method = opts.method ?? (hasBody ? "POST" : "GET");

  return fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      opts.formData ??
      (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: opts.signal,
  });
}

/**
 * Запрос к API: JSON-ответ, единый формат ошибок, авто-refresh при 401.
 */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, opts);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, opts);
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    let code = "ERROR";
    let message = `Ошибка запроса (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      code = data.error.code;
      message = data.error.message;
    } catch {
      // не-JSON ответ — оставляем дефолт
    }
    throw new RequestError(res.status, code, message);
  }

  return (await res.json()) as T;
}

/** Скачивание бинарного файла (отчёт .docx) с авторизацией. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let res = await rawRequest(path, {});
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawRequest(path, {});
  }
  if (!res.ok) {
    let message = `Ошибка скачивания (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      message = data.error.message;
    } catch {
      /* ignore */
    }
    throw new RequestError(res.status, "DOWNLOAD_ERROR", message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Lang": currentLang() },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = (await res.json()) as ApiError;
    throw new RequestError(res.status, data.error.code, data.error.message);
  }
  const data = (await res.json()) as { accessToken: string; user: User };
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  return data.user;
}

export async function logout() {
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    useAuthStore.getState().clear();
  }
}
