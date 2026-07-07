import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "./CountUp";
import { cn } from "@/lib/utils";

/** KPI-карточка дашборда с «набегающим» числом. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  onClick,
  index = 0,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "accent" | "danger" | "success";
  onClick?: () => void;
  index?: number;
}) {
  const styles = {
    default: "bg-card border-border",
    accent:
      "bg-gradient-to-br from-primary to-primary-glow border-transparent text-primary-foreground",
    danger: value > 0 ? "bg-destructive/5 border-destructive/30" : "bg-card border-border",
    success: "bg-card border-border",
  };
  const iconStyles = {
    default: "bg-secondary text-muted-foreground",
    accent: "bg-white/20 text-white",
    danger: value > 0 ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground",
    success: "bg-success/15 text-success",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 text-left shadow-card transition-transform",
        styles[variant],
        onClick && "cursor-pointer hover:-translate-y-0.5",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            variant === "accent" ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl",
            iconStyles[variant],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <span className="text-3xl font-extrabold tracking-tight">
        <CountUp value={value} />
      </span>
    </motion.button>
  );
}
