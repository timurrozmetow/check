import { forwardRef, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Check,
  FolderKanban,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectChip } from "@/components/common/ProjectChip";
import { DonutProgress } from "@/components/common/DonutProgress";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useUnsavedGuard } from "@/components/common/useUnsavedGuard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/api/hooks";
import { PROJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RequestError } from "@/api/client";
import { toast } from "sonner";
import i18n from "@/i18n";
import type { ProjectWithStats } from "@/api/types";

const EASE: [number, number, number, number] = [0.22, 0.7, 0.3, 1];

/** Максимальная длина названия проекта (мягкий лимит на клиенте). */
const NAME_MAX = 120;

function errorMessage(e: unknown): string {
  return e instanceof RequestError ? e.message : i18n.t("common.error");
}

/* -------------------- Форма создания/редактирования -------------------- */

function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: ProjectWithStats | null;
}) {
  const { t } = useTranslation();
  const create = useCreateProject();
  const update = useUpdateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [nameError, setNameError] = useState<string | null>(null);

  const isEdit = project !== null;
  const busy = create.isPending || update.isPending;

  // Незакрытые изменения относительно исходных значений.
  const dirty =
    name !== (project?.name ?? "") ||
    description !== (project?.description ?? "") ||
    color !== (project?.color ?? PROJECT_COLORS[0]);
  const { guardProps, confirmDialog } = useUnsavedGuard(dirty, () =>
    onOpenChange(false),
  );

  // Синхронизируем значения формы при открытии диалога.
  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setColor(project?.color ?? PROJECT_COLORS[0]);
      setNameError(null);
    }
  }, [open, project]);

  function submit() {
    // Значение читаем из актуального состояния формы на момент сабмита.
    const trimmed = name.trim();
    const desc = description.trim();
    if (!trimmed) {
      setNameError(t("adminProjects.nameRequired"));
      return;
    }
    setNameError(null);

    // Закрытие и очистка — строго по успешному ответу сервера.
    const onSuccess = () => {
      toast.success(
        project ? t("adminProjects.updated") : t("adminProjects.created"),
      );
      onOpenChange(false);
    };
    const onError = (e: unknown) => toast.error(errorMessage(e));

    if (project) {
      update.mutate(
        { id: project.id, name: trimmed, description: desc || null, color },
        { onSuccess, onError },
      );
    } else {
      create.mutate(
        { name: trimmed, description: desc || undefined, color },
        { onSuccess, onError },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {confirmDialog}
      <DialogContent className="max-w-md" {...guardProps}>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("adminProjects.editTitle")
              : t("adminProjects.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("adminProjects.formDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">
              {t("adminProjects.nameLabel")}
            </Label>
            <Input
              id="project-name"
              placeholder={t("adminProjects.namePlaceholder")}
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => {
                setName(e.target.value.slice(0, NAME_MAX));
                if (nameError) setNameError(null);
              }}
              autoFocus
              aria-invalid={nameError !== null}
              className={cn(
                nameError && "border-destructive focus-visible:ring-destructive",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <div className="flex items-center justify-between gap-2">
              {nameError ? (
                <p className="text-xs font-medium text-destructive">{nameError}</p>
              ) : (
                <span />
              )}
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums text-muted-foreground",
                  name.length >= NAME_MAX && "font-medium text-warning",
                )}
              >
                {name.length}/{NAME_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">
              {t("adminProjects.descriptionLabel")} ({t("common.optional")})
            </Label>
            <Textarea
              id="project-description"
              placeholder={t("adminProjects.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("adminProjects.colorLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={t("adminProjects.pickColor", { color: c })}
                    aria-pressed={active}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full transition-transform hover:scale-110",
                      active &&
                        "ring-2 ring-offset-2 ring-offset-background",
                    )}
                    style={{
                      backgroundColor: c,
                      ...(active
                        ? ({ "--tw-ring-color": c } as CSSProperties)
                        : {}),
                    }}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Карточка проекта -------------------- */

const ProjectCard = forwardRef<
  HTMLDivElement,
  {
    project: ProjectWithStats;
    index: number;
    onEdit: (p: ProjectWithStats) => void;
  }
>(function ProjectCard({ project, index, onEdit }, ref) {
  const { t } = useTranslation();
  const update = useUpdateProject();
  const del = useDeleteProject();
  const busy = update.isPending || del.isPending;
  const isActive = project.status === "active";
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function toggleStatus() {
    const nextStatus = isActive ? "archived" : "active";
    try {
      await update.mutateAsync({ id: project.id, status: nextStatus });
      toast.success(
        isActive
          ? t("adminProjects.archived")
          : t("adminProjects.activated"),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await del.mutateAsync(project.id);
      toast.success(t("adminProjects.deleted"));
    } catch (e) {
      // Напр. PROJECT_HAS_TASKS — сообщение уже на русском.
      toast.error(errorMessage(e));
      throw e; // не закрывать диалог подтверждения при ошибке
    }
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: EASE, delay: index * 0.04 }}
    >
      <Card
        className={cn(
          "flex h-full flex-col gap-4 p-5 shadow-card transition-opacity",
          !isActive && "opacity-70",
        )}
      >
        <div className="flex items-start gap-4">
          <DonutProgress value={project.avgProgress} color={project.color} size={64} />

          <div className="min-w-0 flex-1">
            <ProjectChip name={project.name} color={project.color} />
            {project.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-muted-foreground/70">
                {t("adminProjects.noDescription")}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 h-8 w-8 shrink-0 text-muted-foreground"
                disabled={busy}
                aria-label={t("adminProjects.actions")}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-48 shadow-card"
            >
              <DropdownMenuItem onSelect={() => onEdit(project)}>
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleStatus}>
                {isActive ? (
                  <>
                    <Archive className="h-4 w-4" />
                    {t("adminProjects.archive")}
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    {t("adminProjects.activate")}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  // Даём меню закрыться и вернуть фокус, затем открываем
                  // диалог — иначе Radix закроет его сразу же.
                  e.preventDefault();
                  setTimeout(() => setConfirmOpen(true), 0);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t("adminProjects.deleteConfirmTitle", { name: project.name })}
          description={t("adminProjects.deleteConfirmDescription")}
          confirmLabel={t("adminProjects.deleteConfirmLabel")}
          onConfirm={remove}
        />

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
          <span className="text-muted-foreground">
            {t("adminProjects.taskCount", {
              active: project.activeTaskCount,
              total: project.totalTaskCount,
            })}
          </span>
          <Badge variant={isActive ? "success" : "secondary"}>
            {t(`projectStatus.${project.status}`)}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
});

/* -------------------- Страница -------------------- */

export function AdminProjects() {
  const { t } = useTranslation();
  const { data: projects, isLoading } = useProjects();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectWithStats | null>(null);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(p: ProjectWithStats) {
    setEditTarget(p);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 3xl:max-w-[110rem] 4xl:max-w-[130rem]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("adminProjects.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminProjects.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("adminProjects.newProject")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (projects?.length ?? 0) === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t("adminProjects.emptyTitle")}
          description={t("adminProjects.emptyDescription")}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("adminProjects.newProject")}
            </Button>
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {projects?.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} onEdit={openEdit} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editTarget}
      />
    </div>
  );
}
