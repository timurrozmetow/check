import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  ListTodo,
} from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { DonutProgress } from "@/components/common/DonutProgress";
import { TaskCard } from "@/features/tasks/TaskCard";
import { DecisionCard } from "@/features/decisions/DecisionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDecisions, useProjects, useTasks } from "@/api/hooks";
import { isOverdue } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DirectorDashboard() {
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: pending } = useDecisions("pending");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  const kpi = useMemo(() => {
    const list = tasks ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      active: list.filter((t) => ACTIVE_STATUSES.includes(t.status)).length,
      completedThisMonth: list.filter(
        (t) =>
          t.completedAt && new Date(t.completedAt) >= monthStart,
      ).length,
      awaiting: pending?.length ?? 0,
      overdue: list.filter(
        (t) =>
          t.deadline &&
          isOverdue(t.deadline) &&
          t.status !== "completed" &&
          t.status !== "cancelled",
      ).length,
    };
  }, [tasks, pending]);

  const visibleTasks = useMemo(() => {
    const list = tasks ?? [];
    const filtered = projectFilter
      ? list.filter((t) => t.projectId === projectFilter)
      : list;
    // Сначала активные, внизу завершённые/отменённые
    return [...filtered].sort((a, b) => {
      const done = (s: string) => (s === "completed" || s === "cancelled" ? 1 : 0);
      return done(a.status) - done(b.status);
    });
  }, [tasks, projectFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Активных задач" value={kpi.active} icon={ListTodo} index={0} />
        <KpiCard
          label="Завершено за месяц"
          value={kpi.completedThisMonth}
          icon={CheckCircle2}
          variant="success"
          index={1}
        />
        <KpiCard
          label="Ждут решения"
          value={kpi.awaiting}
          icon={Gavel}
          variant="accent"
          onClick={() => navigate("/director/decisions")}
          index={2}
        />
        <KpiCard
          label="Просрочено"
          value={kpi.overdue}
          icon={AlertTriangle}
          variant="danger"
          index={3}
        />
      </div>

      {/* Ждут вашего решения — первым блоком */}
      {(pending?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Ждут вашего решения</h2>
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
              {pending?.length}
            </span>
          </div>
          <div className="space-y-4">
            {pending?.map((req, i) => (
              <DecisionCard key={req.id} request={req} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Сводный прогресс проектов */}
      {(projects?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Проекты</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setProjectFilter(projectFilter === p.id ? null : p.id)
                }
                className={cn(
                  "flex items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-card transition-colors",
                  projectFilter === p.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:bg-secondary/40",
                )}
              >
                <DonutProgress value={p.avgProgress} color={p.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.activeTaskCount} активных · {p.totalTaskCount} всего
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Список задач */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Задачи{projectFilter ? " · выбранный проект" : ""}
          </h2>
          {projectFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProjectFilter(null)}
            >
              Показать все
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState icon={ListTodo} title="Задач пока нет" />
        ) : (
          <motion.div layout className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visibleTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePath="/director/tasks"
                  index={i}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
