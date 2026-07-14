import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UpdateStatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FileGrid } from "@/features/tasks/FileGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeleteUpdate, useMyUpdates } from "@/api/hooks";
import { RequestError } from "@/api/client";
import { formatDateTime } from "@/lib/format";
import type { MyUpdateItem } from "@/api/types";

const UpdateRow = forwardRef<
  HTMLDivElement,
  { update: MyUpdateItem; index: number }
>(function UpdateRow({ update: u, index }, ref) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const del = useDeleteUpdate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canRetract = u.status === "pending";

  async function retract() {
    try {
      await del.mutateAsync(u.id);
      toast.success(t("employeeUpdates.retracted"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
      throw e; // не закрывать диалог при ошибке
    }
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
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
            <span className="font-semibold">
              {t("employeeUpdates.rejectReason")}{" "}
            </span>
            {u.rejectReason}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/70">
            {formatDateTime(u.createdAt)}
          </p>
          {canRetract && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("employeeUpdates.retract")}
            </Button>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("employeeUpdates.retractConfirmTitle")}
        description={t("employeeUpdates.retractConfirmDesc")}
        confirmLabel={t("employeeUpdates.retract")}
        onConfirm={retract}
      />
    </motion.div>
  );
});

export function EmployeeUpdates() {
  const { data: updates, isLoading } = useMyUpdates();
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("employeeUpdates.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("employeeUpdates.subtitle")}
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
          title={t("employeeUpdates.empty")}
          description={t("employeeUpdates.emptyDesc")}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {updates?.map((u, i) => (
              <UpdateRow key={u.id} update={u} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
