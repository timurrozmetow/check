import { useEffect, useRef, useState } from "react";
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
import { RequestError } from "@/api/client";
import { toast } from "sonner";
import type { TaskDetail, TaskStatus } from "@/api/types";

/**
 * Быстрые действия админа над задачей: смена статуса и % готовности.
 * Прогресс хранится в локальном оптимистичном состоянии и отправляется
 * абсолютным значением с дебаунсом — без гонки при частых кликах.
 */
export function AdminTaskControls({ task }: { task: TaskDetail }) {
  const changeStatus = useChangeStatus();
  const changeProgress = useChangeProgress();

  const [progress, setProgress] = useState(task.progress);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Синхронизируем со значением сервера, только когда нет отложенной отправки,
  // чтобы не перебить активное редактирование пользователем.
  useEffect(() => {
    if (saveTimer.current === undefined) setProgress(task.progress);
  }, [task.progress]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function commit(next: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(next / 5) * 5));
    setProgress(clamped); // оптимистично — мгновенный отклик
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = undefined;
      changeProgress.mutate(
        { id: task.id, progress: clamped },
        {
          onError: (e) =>
            toast.error(
              e instanceof RequestError ? e.message : "Не удалось сохранить",
            ),
        },
      );
    }, 400);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="w-24 text-sm font-medium text-muted-foreground">
          Статус
        </span>
        <Select
          value={task.status}
          onValueChange={(v) =>
            changeStatus.mutate({ id: task.id, status: v as TaskStatus })
          }
        >
          <SelectTrigger className="w-52">
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
          Готовность
        </span>
        <div className="flex flex-1 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Уменьшить на 5%"
            onClick={() => commit(progress - 5)}
            disabled={progress <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => commit(Number(e.target.value))}
            aria-label="Готовность задачи в процентах"
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Увеличить на 5%"
            onClick={() => commit(progress + 5)}
            disabled={progress >= 100}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <span className="w-14 shrink-0 text-right text-lg font-bold tabular">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
