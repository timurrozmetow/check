import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { notificationBody } from "./format";

interface NotificationsContextValue {
  /** Счётчик «звона» колокольчика — меняется при новом уведомлении. */
  ringKey: number;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  ringKey: 0,
});

export function useNotificationsCtx() {
  return useContext(NotificationsContext);
}

/**
 * Держит SSE-соединение с /notifications/stream, инвалидирует кэш уведомлений
 * и показывает тост при каждом новом событии.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [ringKey, setRingKey] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  // t в ref, чтобы смена языка не пересоздавала SSE-соединение
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!token || !user) return;

    const es = new EventSource(
      `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`,
    );
    esRef.current = es;

    es.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          type: string;
          title: string;
          body: string | null;
          params: Record<string, unknown> | null;
        };
        toast(
          tRef.current(`notificationTitle.${data.type}`, {
            defaultValue: data.title,
          }),
          {
            description:
              notificationBody(
                tRef.current,
                data.type,
                data.params,
                data.body,
              ) ?? undefined,
          },
        );
      } catch {
        /* ignore */
      }
      setRingKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // Обновим и рабочие списки — данные могли измениться
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["moderation"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    });

    es.onerror = () => {
      // EventSource переподключается сам; закрываем только при явном размонтировании
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token, user, qc]);

  return (
    <NotificationsContext.Provider value={{ ringKey }}>
      {children}
    </NotificationsContext.Provider>
  );
}
