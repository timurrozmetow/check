import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/api/hooks";
import { useAuthStore } from "@/stores/auth";
import { dfLocale, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "@/api/types";

const WEEK_STARTS_ON = 1; // понедельник

/** Цвет плашки задачи в календаре: просрочка/статус/приоритет. */
function chipClass(task: TaskListItem): string {
  if (task.status === "completed") return "bg-success/15 text-success";
  if (task.status === "cancelled") return "bg-muted text-muted-foreground";
  // Активная задача с прошедшим дедлайном — просрочка.
  if (isOverdue(task.deadline)) return "bg-destructive/15 text-destructive";
  if (task.priority === "urgent") return "bg-destructive/15 text-destructive";
  if (task.priority === "high") return "bg-warning/15 text-warning";
  return "bg-primary/15 text-primary";
}

export function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const basePath = role === "admin" ? "/admin/tasks" : "/director/tasks";
  const { data: tasks, isLoading } = useTasks();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const locale = dfLocale();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), {
      weekStartsOn: WEEK_STARTS_ON,
    });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskListItem[]>();
    for (const task of tasks ?? []) {
      if (!task.deadline) continue;
      const key = format(new Date(task.deadline), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const weekdays = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(base, i), "EEEEEE", { locale }),
    );
  }, [locale]);

  const withDeadline = (tasks ?? []).filter((x) => x.deadline).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CalendarDays className="h-5 w-5" />
            {t("calendar.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("calendar.subtitle", { count: withDeadline })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("calendar.prev")}
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-40 text-center text-sm font-semibold capitalize">
            {format(cursor, "LLLL yyyy", { locale })}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("calendar.next")}
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            {t("calendar.today")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[520px] rounded-2xl" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
            {weekdays.map((w) => (
              <div
                key={w}
                className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 border-b border-r border-border/60 p-1.5 last:border-r-0",
                    !inMonth && "bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      today
                        ? "bg-primary font-bold text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => navigate(`${basePath}/${task.id}`)}
                        title={task.title}
                        className={cn(
                          "block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium transition-opacity hover:opacity-80",
                          chipClass(task),
                        )}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="px-1 text-[11px] text-muted-foreground">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
