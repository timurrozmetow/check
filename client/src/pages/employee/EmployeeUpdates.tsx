import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { UpdateStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { FileGrid } from "@/features/tasks/FileGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useMyUpdates } from "@/api/hooks";
import { formatDateTime } from "@/lib/format";

export function EmployeeUpdates() {
  const { data: updates, isLoading } = useMyUpdates();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Мои обновления</h1>
        <p className="text-sm text-muted-foreground">
          Статусы отправленных вами обновлений.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (updates?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Send}
          title="Обновлений пока нет"
          description="Откройте задачу и отправьте первое обновление."
        />
      ) : (
        <div className="space-y-3">
          {updates?.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card className="p-4 shadow-card">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/employee/tasks/${u.taskId}`)}
                    className="text-left text-sm font-semibold hover:text-primary"
                  >
                    {u.task.title}
                  </button>
                  <UpdateStatusBadge status={u.status} />
                </div>
                <p className="text-sm text-muted-foreground">{u.text}</p>
                {u.files.length > 0 && (
                  <div className="mt-3">
                    <FileGrid files={u.files} />
                  </div>
                )}
                {u.status === "rejected" && u.rejectReason && (
                  <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <span className="font-semibold">Причина отклонения: </span>
                    {u.rejectReason}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {formatDateTime(u.createdAt)}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
