import { motion } from "framer-motion";
import { CheckSquare, AlertTriangle } from "lucide-react";
import { TaskCard } from "@/features/tasks/TaskCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/api/hooks";

export function EmployeeTasks() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Мои задачи</h1>
        <p className="text-sm text-muted-foreground">
          Задачи, назначенные вам. Нажмите, чтобы открыть и отправить обновление.
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
          title="Не удалось загрузить задачи"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Повторить
            </Button>
          }
        />
      ) : (tasks?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Задач пока нет"
          description="Когда администратор назначит вам задачу, она появится здесь."
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
