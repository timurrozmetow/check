import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Gavel, MessageSquare } from "lucide-react";
import { ProgressBar } from "@/components/common/ProgressBar";
import { ProjectChip } from "@/components/common/ProjectChip";
import { PriorityBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, initials, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "@/api/types";

export function TaskCard({
  task,
  basePath,
  index = 0,
}: {
  task: TaskListItem;
  /** Базовый путь для перехода к задаче, напр. "/admin/tasks". */
  basePath: string;
  index?: number;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const overdue =
    task.deadline &&
    isOverdue(task.deadline) &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => navigate(`${basePath}/${task.id}`)}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ProjectChip name={task.project.name} color={task.project.color} />
            {task.hasPendingDecision && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                <Gavel className="h-3 w-3" />
                {t("taskCard.awaitingDecision")}
              </span>
            )}
          </div>
          <h3 className="truncate text-base font-semibold">{task.title}</h3>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <ProgressBar value={task.progress} size="md" />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <PriorityBadge priority={task.priority} />
          {task.deadline && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(task.deadline)}
            </span>
          )}
          {task.pendingUpdatesCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.pendingUpdatesCount}
            </span>
          )}
        </div>

        <div className="flex -space-x-2">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar
              key={a.id}
              className="h-7 w-7 border-2 border-card"
              title={a.name}
            >
              <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                {initials(a.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignees.length > 3 && (
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-secondary text-[11px] font-semibold text-muted-foreground">
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
