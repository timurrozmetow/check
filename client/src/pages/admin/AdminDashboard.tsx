import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  FolderKanban,
  Gavel,
  ListTodo,
  ShieldCheck,
} from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { DonutProgress } from "@/components/common/DonutProgress";
import { DashboardAnalytics } from "@/features/analytics/DashboardAnalytics";
import { TaskCard } from "@/features/tasks/TaskCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDecisions, useModeration, useProjects, useTasks } from "@/api/hooks";
import { isOverdue } from "@/lib/format";

export function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: moderation } = useModeration();
  const { data: pending } = useDecisions("pending");
  const [showAll, setShowAll] = useState(false);

  const kpi = useMemo(() => {
    const list = tasks ?? [];
    return {
      total: list.length,
      moderation: moderation?.length ?? 0,
      awaiting: pending?.length ?? 0,
      overdue: list.filter(
        (t) =>
          t.deadline &&
          isOverdue(t.deadline) &&
          t.status !== "completed" &&
          t.status !== "cancelled",
      ).length,
    };
  }, [tasks, moderation, pending]);

  const sortedTasks = useMemo(() => {
    return [...(tasks ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [tasks]);

  const visibleTasks = showAll ? sortedTasks : sortedTasks.slice(0, 6);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 3xl:max-w-[110rem] 4xl:max-w-[130rem]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 3xl:max-w-[110rem] 4xl:max-w-[130rem]">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t("adminDashboard.kpiTotal")} value={kpi.total} icon={ListTodo} index={0} />
        <KpiCard
          label={t("adminDashboard.kpiModeration")}
          value={kpi.moderation}
          icon={ShieldCheck}
          variant="accent"
          onClick={() => navigate("/admin/moderation")}
          index={1}
        />
        <KpiCard
          label={t("adminDashboard.kpiAwaiting")}
          value={kpi.awaiting}
          icon={Gavel}
          onClick={() => navigate("/admin/decisions")}
          index={2}
        />
        <KpiCard
          label={t("adminDashboard.kpiOverdue")}
          value={kpi.overdue}
          icon={AlertTriangle}
          variant="danger"
          index={3}
        />
      </div>

      {/* Проекты */}
      {(projects?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{t("adminDashboard.projectsTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
            {projects?.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <DonutProgress value={p.avgProgress} color={p.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("adminDashboard.projectTasks", {
                      active: p.activeTaskCount,
                      total: p.totalTaskCount,
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Аналитика */}
      <DashboardAnalytics tasks={tasks ?? []} />

      {/* Последние задачи */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{t("adminDashboard.recentTasksTitle")}</h2>
          </div>
          {sortedTasks.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? t("adminDashboard.collapse") : t("adminDashboard.showAll")}
            </Button>
          )}
        </div>

        {visibleTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={t("adminDashboard.emptyTitle")}
            description={t("adminDashboard.emptyDescription")}
          />
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {visibleTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePath="/admin/tasks"
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
