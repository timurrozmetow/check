import {
  CheckCircle2,
  CirclePlus,
  Gavel,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACTIVITY_TYPE_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { ActivityItem, TaskStatus } from "@/api/types";

const ICONS: Record<string, LucideIcon> = {
  task_created: CirclePlus,
  status_changed: RefreshCw,
  progress_changed: TrendingUp,
  update_approved: MessageSquare,
  decision_requested: Gavel,
  decision_made: Gavel,
  task_completed: CheckCircle2,
};

function describe(event: ActivityItem): string {
  const p = event.payload ?? {};
  switch (event.type) {
    case "status_changed":
      return `Статус → ${TASK_STATUS_LABELS[p.to as TaskStatus] ?? p.to}`;
    case "progress_changed":
      return `Прогресс ${p.from ?? 0}% → ${p.to}%`;
    case "update_approved":
      return typeof p.text === "string"
        ? `Обновление принято: ${p.text}`
        : "Обновление принято";
    case "decision_requested":
      return typeof p.title === "string"
        ? `Запрошено решение: ${p.title}`
        : "Запрошено решение директора";
    case "decision_made": {
      const opt = typeof p.option === "string" ? `выбран «${p.option}»` : null;
      const appr =
        typeof p.approved === "boolean"
          ? p.approved
            ? "согласовано"
            : "отклонено"
          : null;
      return `Решение принято${opt ? `: ${opt}` : appr ? `: ${appr}` : ""}`;
    }
    default:
      return ACTIVITY_TYPE_LABELS[event.type] ?? event.type;
  }
}

export function Timeline({ events }: { events: ActivityItem[] }) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Событий пока нет
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 pl-2">
      {events.map((event, i) => {
        const Icon = ICONS[event.type] ?? Flag;
        const last = i === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3.5">
            {!last && (
              <span className="absolute left-[15px] top-8 h-full w-px bg-border" />
            )}
            <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium leading-snug">
                {describe(event)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.actor.name} · {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
