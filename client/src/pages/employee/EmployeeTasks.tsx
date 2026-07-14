import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, AlertTriangle, Search } from "lucide-react";
import { TaskCard } from "@/features/tasks/TaskCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/api/hooks";
import { ALL_STATUSES } from "@/lib/constants";
import { useTranslation } from "react-i18next";
import type { TaskStatus } from "@/api/types";

const ANY_STATUS = "any";

export function EmployeeTasks() {
  const { t } = useTranslation();
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ANY_STATUS);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tasks ?? []).filter((task) => {
      if (status !== ANY_STATUS && task.status !== status) return false;
      if (q === "") return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [tasks, query, status]);

  const hasTasks = (tasks?.length ?? 0) > 0;
  const filtering = query.trim() !== "" || status !== ANY_STATUS;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("employeeTasks.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("employeeTasks.subtitle")}
        </p>
      </div>

      {hasTasks && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("employeeTasks.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_STATUS}>
                {t("employeeTasks.anyStatus")}
              </SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`taskStatus.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
      ) : !hasTasks ? (
        <EmptyState
          icon={CheckSquare}
          title={t("employeeTasks.emptyTitle")}
          description={t("employeeTasks.emptyDesc")}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("employeeTasks.noMatchTitle")}
          description={t("employeeTasks.noMatchDesc")}
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus(ANY_STATUS);
                }}
              >
                {t("adminTasks.resetFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          {visible.map((task, i) => (
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
