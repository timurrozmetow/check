import { Minus, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useChangeProgress, useChangeStatus } from "@/api/hooks";
import { ALL_STATUSES } from "@/lib/constants";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { toast } from "sonner";
import type { TaskDetail, TaskStatus } from "@/api/types";

/** Быстрые действия админа над задачей: смена статуса и % (шаг 5). */
export function AdminTaskControls({ task }: { task: TaskDetail }) {
  const changeStatus = useChangeStatus();
  const changeProgress = useChangeProgress();

  function setProgress(next: number) {
    const clamped = Math.max(0, Math.min(100, next));
    changeProgress.mutate(
      { id: task.id, progress: clamped },
      { onError: (e) => toast.error(String(e)) },
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Статус</span>
        <Select
          value={task.status}
          onValueChange={(v) =>
            changeStatus.mutate({ id: task.id, status: v as TaskStatus })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Готовность
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setProgress(task.progress - 5)}
            disabled={task.progress <= 0 || changeProgress.isPending}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-14 text-center text-lg font-bold tabular">
            {task.progress}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setProgress(task.progress + 5)}
            disabled={task.progress >= 100 || changeProgress.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
