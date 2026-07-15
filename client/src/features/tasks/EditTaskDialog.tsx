import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUnsavedGuard } from "@/components/common/useUnsavedGuard";
import { useUpdateTask, useUsers } from "@/api/hooks";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RequestError } from "@/api/client";
import type { TaskDetail } from "@/api/types";

/** Максимальная длина названия — тот же мягкий лимит, что и при создании. */
const TITLE_MAX = 120;

/** Множество id как отсортированная строка — для сравнения «изменилось ли». */
function idsKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

/**
 * Диалог редактирования задачи админом: правка названия (опечатки) и состава
 * исполнителей. Остальные поля меняются в других местах (статус/прогресс —
 * AdminTaskControls). Отправляем только изменённые поля.
 */
export function EditTaskDialog({
  task,
  trigger,
}: {
  task: TaskDetail;
  trigger: ReactNode;
}) {
  const { t } = useTranslation();
  const update = useUpdateTask();
  const { data: users } = useUsers();

  const initialAssignees = useMemo(
    () => task.assignees.map((a) => a.id),
    [task.assignees],
  );

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assigneeIds, setAssigneeIds] = useState<number[]>(initialAssignees);
  const [titleError, setTitleError] = useState<string>();

  // При открытии подтягиваем актуальные значения задачи (задача могла
  // измениться, пока диалог был закрыт).
  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setAssigneeIds(initialAssignees);
      setTitleError(undefined);
    }
  }, [open, task.title, initialAssignees]);

  const employees = (users ?? []).filter((u) => u.role === "employee");

  const titleChanged = title.trim() !== task.title;
  const assigneesChanged = idsKey(assigneeIds) !== idsKey(initialAssignees);
  const dirty = titleChanged || assigneesChanged;

  const { guardProps, confirmDialog } = useUnsavedGuard(dirty, () =>
    setOpen(false),
  );

  function toggleAssignee(id: number) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    if (title.trim().length < 1) {
      setTitleError(t("createTaskDialog.titleRequired"));
      return;
    }
    // Отправляем только то, что реально поменялось (сервер требует ≥1 поле).
    const payload: { title?: string; assigneeIds?: number[] } = {};
    if (titleChanged) payload.title = title.trim();
    if (assigneesChanged) payload.assigneeIds = assigneeIds;
    if (Object.keys(payload).length === 0) {
      setOpen(false);
      return;
    }

    update.mutate(
      { id: task.id, ...payload },
      {
        onSuccess: () => {
          toast.success(t("editTaskDialog.saved"));
          setOpen(false);
        },
        onError: (e) =>
          toast.error(e instanceof RequestError ? e.message : t("common.error")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {confirmDialog}
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        {...guardProps}
      >
        <DialogHeader>
          <DialogTitle>{t("editTaskDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("createTaskDialog.titleLabel")}</Label>
            <Input
              placeholder={t("createTaskDialog.titlePlaceholder")}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, TITLE_MAX));
                if (titleError) setTitleError(undefined);
              }}
              aria-invalid={!!titleError}
              className={cn(
                titleError && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <div className="flex items-center justify-between gap-2">
              {titleError ? (
                <p className="text-xs font-medium text-destructive">{titleError}</p>
              ) : (
                <span />
              )}
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums text-muted-foreground",
                  title.length >= TITLE_MAX && "font-medium text-warning",
                )}
              >
                {title.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("createTaskDialog.assigneesLabel")}</Label>
            {employees.length === 0 ? (
              <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                {t("createTaskDialog.noEmployees")}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {employees.map((u) => {
                  const checked = assigneeIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-secondary/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAssignee(u.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {u.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={update.isPending || !dirty}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
