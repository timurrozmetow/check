import { useState } from "react";
import type { ReactNode } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useChangeOwnPassword } from "@/api/hooks";
import { useAuthStore } from "@/stores/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { initials } from "@/lib/format";
import { toast } from "sonner";
import { RequestError } from "@/api/client";

/** Диалог профиля: данные пользователя + смена собственного пароля. */
export function ProfileDialog({ trigger }: { trigger: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const change = useChangeOwnPassword();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  if (!user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Новый пароль не короче 8 символов");
      return;
    }
    if (next !== repeat) {
      toast.error("Пароли не совпадают");
      return;
    }
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success("Пароль изменён");
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : "Ошибка");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Профиль</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>

        <Separator className="my-2" />

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Смена пароля
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cur">Текущий пароль</Label>
            <Input
              id="cur"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">Новый пароль</Label>
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rep">Повторите новый пароль</Label>
            <Input
              id="rep"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Изменить пароль
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
