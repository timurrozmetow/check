import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { TaskCard } from "@/features/tasks/TaskCard";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { useProjects, useTasks } from "@/api/hooks";
import { ALL_STATUSES } from "@/lib/constants";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import type { TaskListItem, TaskStatus } from "@/api/types";

const ALL_PROJECTS = "all";
const ANY_STATUS = "any";

type SortKey = "created" | "deadline" | "progress" | "priority";
const SORT_LABELS: Record<SortKey, string> = {
  created: "Сначала новые",
  deadline: "По дедлайну",
  progress: "По прогрессу",
  priority: "По приоритету",
};
const PRIORITY_WEIGHT: Record<TaskListItem["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function AdminTasks() {
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS);
  const [status, setStatus] = useState<string>(ANY_STATUS);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("created");

  const { data: projects } = useProjects();
  const { data: tasks, isLoading } = useTasks({
    projectId: projectId === ALL_PROJECTS ? undefined : Number(projectId),
    status: status === ANY_STATUS ? undefined : (status as TaskStatus),
  });

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (tasks ?? []).filter(
      (t) =>
        q === "" ||
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "deadline": {
          const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return ad - bd;
        }
        case "progress":
          return b.progress - a.progress;
        case "priority":
          return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [tasks, query, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Задачи</h1>
          <p className="text-sm text-muted-foreground">
            Все задачи компании с фильтрами по проекту и статусу.
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS}>Все проекты</SelectItem>
            {(projects ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_STATUS}>Любой статус</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Найдено задач: <span className="font-semibold text-foreground">{visibleTasks.length}</span>
          {(projectId !== ALL_PROJECTS ||
            status !== ANY_STATUS ||
            query.trim() !== "") && (
            <button
              type="button"
              onClick={() => {
                setProjectId(ALL_PROJECTS);
                setStatus(ANY_STATUS);
                setQuery("");
              }}
              className="ml-3 font-medium text-primary hover:underline"
            >
              Сбросить фильтры
            </button>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Задач не найдено"
          description="Измените фильтры, поиск или создайте новую задачу."
          action={<CreateTaskDialog />}
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
}
