import type { TFunction } from "i18next";
import type { Role } from "@/api/types";
import { roleHome } from "@/router/role-home";

const ROLE_PREFIXES = ["/admin", "/director", "/employee"];

/**
 * Ссылки уведомлений приходят с сервера без префикса роли
 * (/tasks/5, /moderation, /decisions), а клиентские маршруты префиксованы
 * ролью (/admin/tasks/5 и т.п.). Добавляем /{role} в начало, иначе — 404.
 * Уже префиксованные ссылки не трогаем (на будущее).
 */
export function notificationHref(link: string, role: Role): string {
  if (!link.startsWith("/")) return link;
  if (ROLE_PREFIXES.some((p) => link === p || link.startsWith(p + "/"))) {
    return link;
  }
  return `${roleHome(role)}${link}`;
}

/**
 * Локализованное тело уведомления по типу + params (напр. decision_made).
 * Если params нет — возвращает сохранённый текст (совместимость со старыми).
 */
export function notificationBody(
  t: TFunction,
  type: string,
  params: Record<string, unknown> | null | undefined,
  body: string | null | undefined,
): string | null {
  if (
    type === "decision_made" &&
    params &&
    typeof params.decision === "string"
  ) {
    const title = String(params.title ?? "");
    switch (params.decision) {
      case "choice":
        return t("notificationBody.decisionChoice", {
          title,
          option: String(params.option ?? ""),
        });
      case "approved":
        return t("notificationBody.decisionApproved", { title });
      case "rejected":
        return t("notificationBody.decisionRejected", { title });
    }
  }
  return body ?? null;
}
