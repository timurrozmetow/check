import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCreateTask, useProjects, useUsers } from "@/api/hooks";
import { ALL_PRIORITIES } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RequestError } from "@/api/client";
import type { TaskPriority } from "@/api/types";

/** Диалог создания задачи админом: проект, исполнители, приоритет, дедлайн. */
export function CreateTaskDialog({ trigger }: { trigger?: ReactNode }) {
  const { t } = useTranslation();
  const create = useCreateTask();
  const { data: projects } = useProjects();
  const { data: users } = useUsers();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [errors, setErrors] = useState<{ title?: string; project?: string }>({});

  const employees = (users ?? []).filter((u) => u.role === "employee");

  function reset() {
    setTitle("");
    setDescription("");
    setProjectId("");
    setAssigneeIds([]);
    setPriority("medium");
    setDeadline("");
    setErrors({});
  }

  function toggleAssignee(id: number) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    const next: { title?: string; project?: string } = {};
    if (title.trim().length < 1) next.title = t("createTaskDialog.titleRequired");
    if (projectId === "") next.project = t("createTaskDialog.projectRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Закрытие/очистка — строго по успешному ответу сервера.
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: Number(projectId),
        assigneeIds,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success(t("createTaskDialog.created"));
          reset();
          setOpen(false);
        },
        onError: (e) =>
          toast.error(e instanceof RequestError ? e.message : t("common.error")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("createTaskDialog.newTask")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTaskDialog.newTask")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("createTaskDialog.titleLabel")}</Label>
            <Input
              placeholder={t("createTaskDialog.titlePlaceholder")}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
              aria-invalid={!!errors.title}
              className={cn(
                errors.title && "border-destructive focus-visible:ring-destructive",
              )}
            />
            {errors.title && (
              <p className="text-xs font-medium text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("createTaskDialog.descriptionLabel")}</Label>
            <Textarea
              placeholder={t("createTaskDialog.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("createTaskDialog.projectLabel")}</Label>
              <Select
                value={projectId}
                onValueChange={(v) => {
                  setProjectId(v);
                  if (errors.project)
                    setErrors((p) => ({ ...p, project: undefined }));
                }}
              >
                <SelectTrigger
                  aria-invalid={!!errors.project}
                  className={cn(
                    errors.project &&
                      "border-destructive focus:ring-destructive",
                  )}
                >
                  <SelectValue placeholder={t("createTaskDialog.projectRequired")} />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project && (
                <p className="text-xs font-medium text-destructive">
                  {errors.project}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("createTaskDialog.priorityLabel")}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`taskPriority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("createTaskDialog.deadlineLabel")}</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
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
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-secondary/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAssignee(u.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {u.name}
                      </span>
                    </button>
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
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("createTaskDialog.createBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
