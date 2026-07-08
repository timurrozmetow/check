import { useEffect, useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PasswordInput } from "@/components/common/PasswordInput";
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
import { ROLE_LABELS } from "@/lib/labels";
import { initials } from "@/lib/format";
import type { Role, User } from "@/api/types";
import { toast } from "sonner";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [Role, string][];

const ROLE_BADGE: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  director: "secondary",
  employee: "outline",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function errorMessage(e: unknown): string {
  return e instanceof RequestError ? e.message : "Что-то пошло не так";
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
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map(([role, label]) => (
          <SelectItem key={role} value={role}>
            {label}
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

  async function submit() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Минимум 2 символа";
    if (!isEmail(email)) next.email = "Некорректный email";
    if (password.length < 8) next.password = "Минимум 8 символов";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success("Пользователь создан");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Новый пользователь</DialogTitle>
          <DialogDescription>
            Аккаунт создаёт администратор — регистрации нет.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Имя</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="Иван Петров"
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
            <Label htmlFor="create-password">Пароль</Label>
            <PasswordInput
              id="create-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Минимум 8 символов"
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
            <Label htmlFor="create-role">Роль</Label>
            <RoleSelect id="create-role" value={role} onChange={setRole} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Создать
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
      toast.error("Введите имя (минимум 2 символа)");
      return;
    }
    if (!isEmail(email)) {
      toast.error("Некорректный email");
      return;
    }
    try {
      await update.mutateAsync({
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        role,
      });
      toast.success("Изменения сохранены");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
          <DialogDescription>Имя, email и роль аккаунта.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Имя</Label>
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
            <Label htmlFor="edit-role">Роль</Label>
            <RoleSelect id="edit-role" value={role} onChange={setRole} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
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
  const reset = useResetPassword();
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  async function submit() {
    if (password.length < 8) {
      toast.error("Пароль минимум 8 символов");
      return;
    }
    try {
      await reset.mutateAsync({ id: user.id, password });
      toast.success("Пароль обновлён");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Сбросить пароль</DialogTitle>
          <DialogDescription>
            Новый пароль для «{user.name}».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reset-password">Новый пароль</Label>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={reset.isPending}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={reset.isPending}>
            {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сбросить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Строка пользователя ---------- */

function UserRow({ user, index }: { user: User; index: number }) {
  const currentUser = useAuthStore((s) => s.user);
  const update = useUpdateUser();
  const isSelf = currentUser?.id === user.id;
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function toggleActive(next: boolean) {
    try {
      await update.mutateAsync({ id: user.id, isActive: next });
      toast.success(next ? "Пользователь активирован" : "Пользователь отключён");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <motion.div
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
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{user.name}</p>
            <Badge variant={ROLE_BADGE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
            {isSelf && (
              <span className="text-xs text-muted-foreground">(это вы)</span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div
          className="flex items-center gap-2"
          title={isSelf ? "Нельзя отключить свой аккаунт" : undefined}
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {user.isActive ? "Активен" : "Отключён"}
          </span>
          <Switch
            checked={user.isActive}
            onCheckedChange={toggleActive}
            disabled={isSelf || update.isPending}
            aria-label="Активность пользователя"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Действия</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setResetOpen(true)}>
              <KeyRound className="h-4 w-4" />
              Сбросить пароль
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
}

/* ---------- Страница ---------- */

export function AdminUsers() {
  const { data: users, isLoading } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">
            Создавайте аккаунты, назначайте роли и управляйте доступом.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Новый пользователь
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
          title="Пользователей пока нет"
          description="Создайте первый аккаунт кнопкой «Новый пользователь»."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Новый пользователь
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
