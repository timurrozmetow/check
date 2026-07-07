import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMarkRead, useNotifications } from "@/api/hooks";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNotificationsCtx } from "./NotificationsProvider";

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const navigate = useNavigate();
  const { ringKey } = useNotificationsCtx();
  const [ringing, setRinging] = useState(false);

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  useEffect(() => {
    if (ringKey === 0) return;
    setRinging(true);
    const t = setTimeout(() => setRinging(false), 600);
    return () => clearTimeout(t);
  }, [ringKey]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Уведомления"
          className="relative grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className={cn("h-[18px] w-[18px]", ringing && "animate-bell-ring")} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-semibold">Уведомления</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => markRead.mutate(undefined)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Прочитать все
            </Button>
          )}
        </div>
        <div className="thin-scrollbar max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Уведомлений пока нет
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((n) => (
                <motion.button
                  key={n.id}
                  type="button"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate([n.id]);
                    if (n.link) navigate(n.link);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                    !n.isRead && "bg-accent/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
