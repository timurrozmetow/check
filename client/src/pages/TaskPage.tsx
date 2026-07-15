import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarDays,
  Gavel,
  MessageSquare,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { ProjectChip } from "@/components/common/ProjectChip";
import {
  PriorityBadge,
  StatusBadge,
  UpdateStatusBadge,
} from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Timeline } from "@/features/tasks/Timeline";
import { TaskSummary } from "@/features/tasks/TaskSummary";
import { FileGrid } from "@/features/tasks/FileGrid";
import { AdminTaskControls } from "@/features/tasks/AdminTaskControls";
import { EditTaskDialog } from "@/features/tasks/EditTaskDialog";
import { UpdateForm } from "@/features/updates/UpdateForm";
import { CreateDecisionDialog } from "@/features/decisions/CreateDecisionDialog";
import {
  useDeleteTask,
  useTask,
  useTaskTimeline,
  useTaskUpdates,
} from "@/api/hooks";
import { RequestError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TaskPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const taskId = id ? Number(id) : null;
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const deleteTask = useDeleteTask();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: task, isLoading, error } = useTask(taskId);
  const { data: timeline } = useTaskTimeline(taskId);
  const { data: updates } = useTaskUpdates(taskId);

  async function handleDelete() {
    if (taskId === null) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success(t("taskPage.taskDeleted"));
      navigate(-1);
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
      throw e; // не закрывать диалог при ошибке
    }
  }

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
                <UserAvatar
                  key={a.id}
                  name={a.name}
                  avatar={a.avatar}
                  title={a.name}
                  className="h-7 w-7 border-2 border-card"
                  fallbackClassName="text-[11px]"
                />
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
          <div className="flex flex-wrap justify-end gap-2">
            <EditTaskDialog
              task={task}
              trigger={
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("taskPage.editTask")}
                </Button>
              }
            />
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("taskPage.deleteTask")}
            </Button>
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
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={t("taskPage.deleteConfirmTitle", { title: task.title })}
            description={t("taskPage.deleteConfirmDesc")}
            confirmLabel={t("taskPage.deleteTask")}
            onConfirm={handleDelete}
          />
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

      {/* Обновления по задаче (с вложениями сотрудников) */}
      {(updates?.length ?? 0) > 0 && (
        <Card className="p-5 shadow-card sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <MessageSquare className="h-5 w-5" />
            {t("taskPage.updatesHeading")}
          </h2>
          <div className="space-y-4">
            {updates?.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-border bg-secondary/30 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <UserAvatar
                    name={u.author.name}
                    avatar={u.author.avatar}
                    className="h-7 w-7"
                    fallbackClassName="text-[11px]"
                  />
                  <span className="text-sm font-semibold">{u.author.name}</span>
                  <UpdateStatusBadge status={u.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(u.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {u.text}
                </p>
                {u.files.length > 0 && (
                  <div className="mt-3">
                    <FileGrid files={u.files} />
                  </div>
                )}
                {u.status === "rejected" && u.rejectReason && (
                  <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <span className="font-semibold">
                      {t("employeeUpdates.rejectReason")}{" "}
                    </span>
                    {u.rejectReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Директору — сводка вместо технической хронологии; остальным — лента событий */}
      {role === "director" ? (
        <Card className="p-5 shadow-card sm:p-6">
          <h2 className="mb-2 text-lg font-bold">{t("taskSummary.heading")}</h2>
          <TaskSummary task={task} lastUpdate={updates?.[0]} />
        </Card>
      ) : (
        <Card className="p-5 shadow-card sm:p-6">
          <h2 className="mb-4 text-lg font-bold">{t("taskPage.timeline")}</h2>
          <Timeline events={timeline ?? []} />
        </Card>
      )}
    </div>
  );
}
