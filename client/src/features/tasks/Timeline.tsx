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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

function describe(event: ActivityItem, t: TFunction): string {
  const p = event.payload ?? {};
  switch (event.type) {
    case "status_changed":
      return t("timeline.statusChanged", {
        status: t(`taskStatus.${p.to as TaskStatus}`, {
          defaultValue: String(p.to),
        }),
      });
    case "progress_changed":
      return t("timeline.progressChanged", { from: p.from ?? 0, to: p.to });
    case "update_approved":
      return typeof p.text === "string"
        ? t("timeline.updateApprovedWithText", { text: p.text })
        : t("timeline.updateApproved");
    case "decision_requested":
      return typeof p.title === "string"
        ? t("timeline.decisionRequestedWithTitle", { title: p.title })
        : t("timeline.decisionRequested");
    case "decision_made": {
      if (typeof p.option === "string") {
        return t("timeline.decisionMadeOption", { option: p.option });
      }
      if (typeof p.approved === "boolean") {
        return p.approved
          ? t("timeline.decisionMadeApproved")
          : t("timeline.decisionMadeRejected");
      }
      return t("timeline.decisionMade");
    }
    default:
      return t(`activityType.${event.type}`, { defaultValue: event.type });
  }
}

export function Timeline({ events }: { events: ActivityItem[] }) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("timeline.empty")}
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
                {describe(event, t)}
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
