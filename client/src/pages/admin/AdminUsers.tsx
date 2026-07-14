import { forwardRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PasswordInput } from "@/components/common/PasswordInput";
import { useUnsavedGuard } from "@/components/common/useUnsavedGuard";
import { cn } from "@/lib/utils";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateUser,
  useResetPassword,
  useUpdateUser,
  useUsers,
} from "@/api/hooks";
import { RequestError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import type { Role, User } from "@/api/types";
import { toast } from "sonner";
import i18n from "@/i18n";

const ROLE_OPTIONS: Role[] = ["admin", "director", "employee"];

const ROLE_BADGE: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  director: "secondary",
  employee: "outline",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function errorMessage(e: unknown): string {
  return e instanceof RequestError ? e.message : i18n.t("adminUsers.genericError");
}

/* ---------- Выбор роли ---------- */

function RoleSelect({
  value,
  onChange,
  id,
}: {
  value: Role;
  onChange: (role: Role) => void;
  id?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((role) => (
          <SelectItem key={role} value={role}>
            {t(`role.${role}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- Создание пользователя ---------- */

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");
      setErrors({});
    }
  }, [open]);

  const dirty =
    name !== "" || email !== "" || password !== "" || role !== "employee";
  const { guardProps, confirmDialog } = useUnsavedGuard(dirty, () =>
    onOpenChange(false),
  );

  async function submit() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = t("adminUsers.nameMin");
    if (!isEmail(email)) next.email = t("adminUsers.emailInvalid");
    if (password.length < 8) next.password = t("adminUsers.passwordHint");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success(t("adminUsers.createSuccess"));
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {confirmDialog}
      <DialogContent className="rounded-2xl" {...guardProps}>
        <DialogHeader>
          <DialogTitle>{t("adminUsers.newUser")}</DialogTitle>
          <DialogDescription>
            {t("adminUsers.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">{t("adminUsers.fieldName")}</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder={t("adminUsers.namePlaceholder")}
              autoFocus
              aria-invalid={!!errors.name}
              className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder="ivan@example.com"
              aria-invalid={!!errors.email}
              className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">{t("adminUsers.fieldPassword")}</Label>
            <PasswordInput
              id="create-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder={t("adminUsers.passwordHint")}
              aria-invalid={!!errors.password}
              className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">
                {errors.password}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">{t("adminUsers.fieldRole")}</Label>
            <RoleSelect id="create-role" value={role} onChange={setRole} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Редактирование пользователя ---------- */

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateUser();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);

  useEffect(() => {
    if (open) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    }
  }, [open, user]);

  async function submit() {
    if (name.trim().length < 2) {
      toast.error(t("adminUsers.editNameRequired"));
      return;
    }
    if (!isEmail(email)) {
      toast.error(t("adminUsers.emailInvalid"));
      return;
    }
    try {
      await update.mutateAsync({
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      toast.success(t("adminUsers.editSuccess"));
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("adminUsers.editTitle")}</DialogTitle>
          <DialogDescription>{t("adminUsers.editDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t("adminUsers.fieldName")}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">{t("adminUsers.fieldRole")}</Label>
            <RoleSelect id="edit-role" value={role} onChange={setRole} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Сброс пароля ---------- */

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const reset = useResetPassword();
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  async function submit() {
    if (password.length < 8) {
      toast.error(t("adminUsers.resetPasswordMin"));
      return;
    }
    try {
      await reset.mutateAsync({ id: user.id, password });
      toast.success(t("adminUsers.resetSuccess"));
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("adminUsers.resetPassword")}</DialogTitle>
          <DialogDescription>
            {t("adminUsers.resetDesc", { name: user.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reset-password">{t("adminUsers.newPassword")}</Label>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("adminUsers.passwordHint")}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={reset.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={reset.isPending}>
            {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("adminUsers.resetBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Строка пользователя ---------- */

const UserRow = forwardRef<
  HTMLDivElement,
  { user: User; index: number }
>(function UserRow({ user, index }, ref) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const update = useUpdateUser();
  const isSelf = currentUser?.id === user.id;
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function toggleActive(next: boolean) {
    try {
      await update.mutateAsync({ id: user.id, isActive: next });
      toast.success(
        next ? t("adminUsers.activatedSuccess") : t("adminUsers.deactivatedSuccess"),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 0.7, 0.3, 1],
        delay: index * 0.04,
      }}
    >
      <Card className="flex items-center gap-3 p-4 shadow-card sm:gap-4">
        <UserAvatar
          name={user.name}
          avatar={user.avatar}
          className="h-11 w-11 shrink-0"
          fallbackClassName="text-sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{user.name}</p>
            <Badge variant={ROLE_BADGE[user.role]}>{t(`role.${user.role}`)}</Badge>
            {isSelf && (
              <span className="text-xs text-muted-foreground">{t("adminUsers.isSelf")}</span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div
          className="flex items-center gap-2"
          title={isSelf ? t("adminUsers.cannotDisableSelf") : undefined}
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {user.isActive ? t("adminUsers.active") : t("adminUsers.inactive")}
          </span>
          <Switch
            checked={user.isActive}
            onCheckedChange={toggleActive}
            disabled={isSelf || update.isPending}
            aria-label={t("adminUsers.activitySwitch")}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{t("adminUsers.actions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setResetOpen(true)}>
              <KeyRound className="h-4 w-4" />
              {t("adminUsers.resetPassword")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
        <ResetPasswordDialog
          user={user}
          open={resetOpen}
          onOpenChange={setResetOpen}
        />
      </Card>
    </motion.div>
  );
});

/* ---------- Страница ---------- */

export function AdminUsers() {
  const { t } = useTranslation();
  const { data: users, isLoading } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 3xl:max-w-[96rem]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{t("adminUsers.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminUsers.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t("adminUsers.newUser")}
        </Button>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : (users?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title={t("adminUsers.emptyTitle")}
          description={t("adminUsers.emptyDesc")}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("adminUsers.newUser")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {users?.map((user, i) => (
              <UserRow key={user.id} user={user} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
