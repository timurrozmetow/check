import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/theme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Единый переключатель светлой/тёмной темы. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? t("themeToggle.enableLight") : t("themeToggle.enableDark")}
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {isDark ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? t("themeToggle.light") : t("themeToggle.dark")}
      </TooltipContent>
    </Tooltip>
  );
}
