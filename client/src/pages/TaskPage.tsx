import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarDays, Gavel, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { ProjectChip } from "@/components/common/ProjectChip";
import { PriorityBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Timeline } from "@/features/tasks/Timeline";
import { FileGrid } from "@/features/tasks/FileGrid";
import { AdminTaskControls } from "@/features/tasks/AdminTaskControls";
import { UpdateForm } from "@/features/updates/UpdateForm";
import { CreateDecisionDialog } from "@/features/decisions/CreateDecisionDialog";
import { useTask, useTaskTimeline } from "@/api/hooks";
import { useAuthStore } from "@/stores/auth";
import { formatDate, initials, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TaskPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const taskId = id ? Number(id) : null;
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const { data: task, isLoading, error } = useTask(taskId);
  const { data: timeline } = useTaskTimeline(taskId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-lg font-semibold">{t("taskPage.unavailableTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("taskPage.unavailableDesc")}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const overdue =
    task.deadline &&
    isOverdue(task.deadline) &&
    task.status !== "completed" &&
    task.status !== "cancelled";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </button>

      {/* Шапка задачи */}
      <Card className="p-5 shadow-card sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ProjectChip name={task.project.name} color={task.project.color} />
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.hasPendingDecision && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              <Gavel className="h-3.5 w-3.5" />
              {t("taskPage.awaitingDirector")}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold">{task.title}</h1>
        {task.description && (
          <p className="mt-2 text-muted-foreground">{task.description}</p>
        )}

        <div className="mt-4">
          <ProgressBar value={task.progress} size="lg" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {task.deadline && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {t("taskPage.deadline", { date: formatDate(task.deadline) })}
              {overdue && ` · ${t("taskPage.overdue")}`}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("taskPage.assignees")}</span>
            <div className="flex -space-x-2">
              {task.assignees.map((a) => (
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
              {task.assignees.length === 0 && (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Действия админа */}
      {role === "admin" && (
        <>
          <AdminTaskControls task={task} />
          <div className="flex justify-end">
            <CreateDecisionDialog
              taskId={task.id}
              trigger={
                <Button variant="outline">
                  <Gavel className="mr-2 h-4 w-4" />
                  {t("taskPage.requestDecision")}
                </Button>
              }
            />
          </div>
        </>
      )}

      {/* Отправка обновления — сотрудник */}
      {role === "employee" && (
        <Card className="p-5 shadow-card sm:p-6">
          <h2 className="mb-3 text-lg font-bold">{t("taskPage.submitUpdate")}</h2>
          <UpdateForm taskId={task.id} />
        </Card>
      )}

      {/* Файлы задачи */}
      {task.files.length > 0 && (
        <Card className="p-5 shadow-card sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Paperclip className="h-5 w-5" />
            {t("taskPage.files")}
          </h2>
          <FileGrid files={task.files} />
        </Card>
      )}

      {/* Хронология */}
      <Card className="p-5 shadow-card sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{t("taskPage.timeline")}</h2>
        <Timeline events={timeline ?? []} />
      </Card>
    </div>
  );
}
