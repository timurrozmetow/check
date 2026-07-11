import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  TASK_PRIORITY_BADGE,
  TASK_STATUS_BADGE,
  UPDATE_STATUS_BADGE,
} from "@/lib/labels";
import type { TaskPriority, TaskStatus, UpdateStatus } from "@/api/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap";

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span className={cn(base, TASK_STATUS_BADGE[status], className)}>
      {t(`taskStatus.${status}`)}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span className={cn(base, TASK_PRIORITY_BADGE[priority], className)}>
      {t(`taskPriority.${priority}`)}
    </span>
  );
}

export function UpdateStatusBadge({
  status,
  className,
}: {
  status: UpdateStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span className={cn(base, UPDATE_STATUS_BADGE[status], className)}>
      {t(`updateStatus.${status}`)}
    </span>
  );
}
