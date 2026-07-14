import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trello } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { PriorityBadge } from "@/components/common/StatusBadge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useChangeStatus, useTasks } from "@/api/hooks";
import { ALL_STATUSES } from "@/lib/constants";
import { TASK_STATUS_BADGE } from "@/lib/labels";
import { RequestError } from "@/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskListItem, TaskStatus } from "@/api/types";

function BoardCard({
  task,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  task: TaskListItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-card active:cursor-grabbing"
    >
      <p className="mb-2 line-clamp-2 text-sm font-medium">{task.title}</p>
      <ProgressBar value={task.progress} size="sm" />
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <div className="flex -space-x-2">
          {task.assignees.slice(0, 3).map((a) => (
            <UserAvatar
              key={a.id}
              name={a.name}
              avatar={a.avatar}
              title={a.name}
              className="h-6 w-6 border-2 border-card"
              fallbackClassName="text-[10px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Kanban-доска: перетаскивание карточек между статусами (только админ). */
export function BoardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useTasks();
  const changeStatus = useChangeStatus();
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  function handleDrop(status: TaskStatus) {
    const id = dragId;
    setOverCol(null);
    setDragId(null);
    if (id == null) return;
    const task = tasks?.find((x) => x.id === id);
    if (!task || task.status === status) return;
    changeStatus.mutate(
      { id, status },
      {
        onError: (e) =>
          toast.error(
            e instanceof RequestError ? e.message : t("common.error"),
          ),
      },
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Trello className="h-5 w-5" />
          {t("board.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("board.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 thin-scrollbar">
          {ALL_STATUSES.map((status) => {
            const col = (tasks ?? []).filter((x) => x.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (overCol !== status) setOverCol(status);
                }}
                onDragLeave={() =>
                  setOverCol((c) => (c === status ? null : c))
                }
                onDrop={() => handleDrop(status)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-2xl border bg-secondary/30 p-2 transition-colors",
                  overCol === status
                    ? "border-primary bg-accent/40"
                    : "border-border",
                )}
              >
                <div className="mb-2 flex items-center justify-between px-2 py-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      TASK_STATUS_BADGE[status],
                    )}
                  >
                    {t(`taskStatus.${status}`)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {col.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {col.map((task) => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      onOpen={() => navigate(`/admin/tasks/${task.id}`)}
                    />
                  ))}
                  {col.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                      {t("board.empty")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
