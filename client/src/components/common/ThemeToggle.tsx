import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";

/** Пилюля-переключатель светлой/тёмной темы (как в дизайн-образце). */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5">
      <button
        type="button"
        aria-label="Светлая тема"
        onClick={() => theme === "dark" && toggle()}
        className={cn(
          "grid h-6 w-8 place-items-center rounded-full transition-colors",
          theme === "light"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Тёмная тема"
        onClick={() => theme === "light" && toggle()}
        className={cn(
          "grid h-6 w-8 place-items-center rounded-full transition-colors",
          theme === "dark"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
