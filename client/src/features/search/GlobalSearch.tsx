import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useTasks } from "@/api/hooks";
import { useAuthStore } from "@/stores/auth";

/** Общий поиск по задачам в шапке — для всех ролей. */
export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const base =
    role === "admin"
      ? "/admin/tasks"
      : role === "director"
        ? "/director/tasks"
        : "/employee/tasks";
  const { data: tasks } = useTasks();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return (tasks ?? [])
      .filter(
        (x) =>
          x.title.toLowerCase().includes(query) ||
          (x.description ?? "").toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [tasks, q]);

  function go(id: number) {
    setOpen(false);
    setQ("");
    navigate(`${base}/${id}`);
  }

  return (
    <div className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        className="h-9 w-44 pl-8 md:w-60"
      />

      {open && q.trim() !== "" && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              {t("search.empty")}
            </div>
          ) : (
            results.map((task) => (
              <button
                key={task.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // не терять фокус до навигации
                  go(task.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {task.title}
                </span>
                <StatusBadge status={task.status} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
