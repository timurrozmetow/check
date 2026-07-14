import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { UpdateStatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import type { TaskDetail, UpdateItem } from "@/api/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

/**
 * Компактная сводка по задаче для директора — вместо технической хронологии.
 * Ключевое одним взглядом: кто, статус/прогресс, последнее обновление,
 * ожидающие решения, дедлайн.
 */
export function TaskSummary({
  task,
  lastUpdate,
}: {
  task: TaskDetail;
  lastUpdate?: UpdateItem;
}) {
  const { t } = useTranslation();
  const assignees =
    task.assignees.map((a) => a.name).join(", ") || "—";

  return (
    <div className="divide-y divide-border/60">
      <Row label={t("taskSummary.assignees")}>{assignees}</Row>

      <Row label={t("taskSummary.status")}>
        {t(`taskStatus.${task.status}`)} · {task.progress}%
      </Row>

      <Row label={t("taskSummary.lastUpdate")}>
        {lastUpdate ? (
          <span className="flex flex-col items-end gap-1">
            <span className="line-clamp-2">«{lastUpdate.text}»</span>
            <UpdateStatusBadge status={lastUpdate.status} />
          </span>
        ) : (
          "—"
        )}
      </Row>

      <Row label={t("taskSummary.decision")}>
        <span
          className={
            task.hasPendingDecision ? "text-accent-foreground" : undefined
          }
        >
          {task.hasPendingDecision
            ? t("taskSummary.decisionPending")
            : t("taskSummary.decisionNone")}
        </span>
      </Row>

      <Row label={t("taskSummary.deadline")}>
        {task.deadline ? formatDate(task.deadline) : "—"}
      </Row>
    </div>
  );
}
