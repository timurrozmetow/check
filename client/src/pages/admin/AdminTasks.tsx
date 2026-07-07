import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { TaskCard } from "@/features/tasks/TaskCard";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { useProjects, useTasks } from "@/api/hooks";
import { ALL_STATUSES } from "@/lib/constants";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import type { TaskStatus } from "@/api/types";

const ALL_PROJECTS = "all";
const ANY_STATUS = "any";

export function AdminTasks() {
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS);
  const [status, setStatus] = useState<string>(ANY_STATUS);

  const { data: projects } = useProjects();
  const { data: tasks, isLoading } = useTasks({
    projectId: projectId === ALL_PROJECTS ? undefined : Number(projectId),
    status: status === ANY_STATUS ? undefined : (status as TaskStatus),
  });

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
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-56">
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
          <SelectTrigger className="w-48">
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (tasks?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Задач не найдено"
          description="Измените фильтры или создайте новую задачу."
          action={<CreateTaskDialog />}
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {tasks?.map((task, i) => (
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
