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
import { TASK_PRIORITY_LABELS } from "@/lib/labels";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import type { TaskPriority } from "@/api/types";

/** Диалог создания задачи админом: проект, исполнители, приоритет, дедлайн. */
export function CreateTaskDialog({ trigger }: { trigger?: ReactNode }) {
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
    if (title.trim().length < 1) next.title = "Укажите название задачи";
    if (projectId === "") next.project = "Выберите проект";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: Number(projectId),
        assigneeIds,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      toast.success("Задача создана");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Ошибка");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новая задача
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Название</Label>
            <Input
              placeholder="Например: Подготовить договор аренды"
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
            <Label>Описание (необязательно)</Label>
            <Textarea
              placeholder="Детали задачи…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Проект</Label>
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
                  <SelectValue placeholder="Выберите проект" />
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
              <Label>Приоритет</Label>
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
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Дедлайн (необязательно)</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Исполнители</Label>
            {employees.length === 0 ? (
              <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                Нет доступных сотрудников.
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
            Отмена
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать задачу
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
