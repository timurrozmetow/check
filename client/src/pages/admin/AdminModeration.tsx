import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { FileGrid } from "@/features/tasks/FileGrid";
import { useApproveUpdate, useModeration, useRejectUpdate } from "@/api/hooks";
import { formatDateTime, initials } from "@/lib/format";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import type { ModerationItem } from "@/api/types";

function ModerationRow({ item }: { item: ModerationItem }) {
  const approve = useApproveUpdate();
  const reject = useRejectUpdate();
  const [progress, setProgress] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function doApprove() {
    try {
      const prog = progress.trim() === "" ? undefined : Number(progress);
      if (prog !== undefined && (prog < 0 || prog > 100 || prog % 5 !== 0)) {
        toast.error("Процент 0–100, кратно 5");
        return;
      }
      await approve.mutateAsync({ id: item.id, progress: prog });
      toast.success("Обновление принято");
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Ошибка");
    }
  }

  async function doReject() {
    if (reason.trim().length < 3) {
      toast.error("Укажите причину");
      return;
    }
    try {
      await reject.mutateAsync({ id: item.id, reason: reason.trim() });
      toast.success("Обновление отклонено");
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Ошибка");
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <Card className="p-5 shadow-card">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {initials(item.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{item.author.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.task.projectName} · {item.task.title}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(item.createdAt)}
          </span>
        </div>

        <p className="rounded-xl bg-secondary/50 p-3 text-sm">{item.text}</p>

        {item.files.length > 0 && (
          <div className="mt-3">
            <FileGrid files={item.files} />
          </div>
        )}

        {rejecting ? (
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="Причина отклонения…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={doReject}
                disabled={reject.isPending}
              >
                {reject.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Отклонить
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <div className="mr-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Выставить %:
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step={5}
                placeholder="—"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="h-9 w-20"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejecting(true)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Отклонить
            </Button>
            <Button size="sm" onClick={doApprove} disabled={approve.isPending}>
              {approve.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Принять
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export function AdminModeration() {
  const { data: updates, isLoading } = useModeration();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Модерация обновлений</h1>
        <p className="text-sm text-muted-foreground">
          Подтверждённые обновления попадают в хронологию и видны директору.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (updates?.length ?? 0) === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Очередь пуста"
          description="Все обновления промодерированы."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {updates?.map((item) => (
              <ModerationRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
