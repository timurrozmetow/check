import type { TFunction } from "i18next";

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
