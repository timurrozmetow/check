import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { TaskListItem, TaskStatus } from "@/api/types";

const STATUS_COLORS: Record<TaskStatus, string> = {
  new: "#64748b",
  in_progress: "#6366f1",
  review: "#f59e0b",
  awaiting_decision: "#a855f7",
  completed: "#22c55e",
  paused: "#94a3b8",
  cancelled: "#ef4444",
};

/** Кольцевая диаграмма распределения задач по статусам. */
function StatusDonut({ tasks }: { tasks: TaskListItem[] }) {
  const { t } = useTranslation();
  const segments = useMemo(() => {
    const counts = new Map<TaskStatus, number>();
    for (const t of tasks) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ status, value }));
  }, [tasks]);

  const total = tasks.length;
  const size = 160;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
            />
          ) : (
            segments.map((s) => {
              const frac = s.value / total;
              const dash = frac * c;
              const el = (
                <motion.circle
                  key={s.status}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={STATUS_COLORS[s.status]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              );
              offset += dash;
              return el;
            })
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-2xl font-extrabold tabular">{total}</span>
          <span className="text-xs text-muted-foreground">
            {t("dashboardAnalytics.tasksLabel", { count: total })}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((s) => (
          <div key={s.status} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[s.status] }}
            />
            <span className="text-muted-foreground">
              {t(`taskStatus.${s.status}`)}
            </span>
            <span className="font-semibold tabular">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Выбирает чёрный/белый текст с наибольшим контрастом к цвету фона (WCAG). */
function readableTextColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * toLinear(parseInt(h.slice(0, 2), 16)) +
    0.7152 * toLinear(parseInt(h.slice(2, 4), 16)) +
    0.0722 * toLinear(parseInt(h.slice(4, 6), 16));
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastBlack > contrastWhite ? "#0f172a" : "#ffffff";
}

/** Горизонтальные полосы: количество задач по проектам. */
function ProjectBars({ tasks }: { tasks: TaskListItem[] }) {
  const bars = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    for (const t of tasks) {
      const cur = map.get(t.project.name);
      if (cur) cur.count += 1;
      else map.set(t.project.name, { count: 1, color: t.project.color });
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {bars.map((b, i) => (
        <div key={b.name} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">
            {b.name}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-lg bg-muted">
            <motion.div
              className="flex h-full items-center justify-end rounded-lg pr-2 text-xs font-bold"
              style={{ backgroundColor: b.color, color: readableTextColor(b.color) }}
              initial={{ width: 0 }}
              animate={{ width: `${(b.count / max) * 100}%` }}
              transition={{
                duration: 0.7,
                delay: i * 0.06,
                ease: [0.22, 0.7, 0.3, 1],
              }}
            >
              {b.count}
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Секция аналитики для дашборда админа. */
export function DashboardAnalytics({ tasks }: { tasks: TaskListItem[] }) {
  const { t } = useTranslation();
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">{t("dashboardAnalytics.title")}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            {t("dashboardAnalytics.byStatus")}
          </h3>
          <StatusDonut tasks={tasks} />
        </Card>
        <Card className="p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            {t("dashboardAnalytics.byProject")}
          </h3>
          <ProjectBars tasks={tasks} />
        </Card>
      </div>
    </section>
  );
}
