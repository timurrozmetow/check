import { motion } from "framer-motion";
import { CheckSquare, AlertTriangle } from "lucide-react";
import { TaskCard } from "@/features/tasks/TaskCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/api/hooks";
import { useTranslation } from "react-i18next";

export function EmployeeTasks() {
  const { t } = useTranslation();
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("employeeTasks.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("employeeTasks.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={t("employeeTasks.loadErrorTitle")}
          description={t("employeeTasks.loadErrorDesc")}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : (tasks?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t("employeeTasks.emptyTitle")}
          description={t("employeeTasks.emptyDesc")}
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          {tasks?.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              basePath="/employee/tasks"
              index={i}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
