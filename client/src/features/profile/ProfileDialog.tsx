import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Camera, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useChangeOwnPassword } from "@/api/hooks";
import { uploadAvatar, removeAvatar } from "@/api/upload";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RequestError } from "@/api/client";

/** Диалог профиля: данные пользователя + аватар + смена собственного пароля. */
export function ProfileDialog({ trigger }: { trigger: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const change = useChangeOwnPassword();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      toast.success(t("profileDialog.avatarUpdated"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true);
    try {
      const updated = await removeAvatar();
      setUser(updated);
      toast.success(t("profileDialog.avatarRemoved"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error(t("profileDialog.passwordTooShort"));
      return;
    }
    if (next !== repeat) {
      toast.error(t("profileDialog.passwordMismatch"));
      return;
    }
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success(t("profileDialog.passwordChanged"));
      setCurrent("");
      setNext("");
      setRepeat("");
    } catch (err) {
      toast.error(err instanceof RequestError ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profileDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <div className="group relative">
            <UserAvatar
              name={user.name}
              avatar={user.avatar}
              className="h-14 w-14"
              fallbackClassName="text-base"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              aria-label={t("profileDialog.changeAvatar")}
              className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
            >
              {avatarBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · {t(`role.${user.role}`)}
            </p>
            <div className="mt-1 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                {t("profileDialog.changeAvatar")}
              </button>
              {user.avatar && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("profileDialog.removeAvatar")}
                </button>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("profileDialog.changePassword")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cur">{t("profileDialog.currentPassword")}</Label>
            <PasswordInput
              id="cur"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">{t("profileDialog.newPassword")}</Label>
            <PasswordInput
              id="new"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rep">{t("profileDialog.repeatPassword")}</Label>
            <PasswordInput
              id="rep"
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
              {t("profileDialog.submitBtn")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
