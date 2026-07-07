import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Анимированный градиентный прогресс-бар с крупным процентом —
 * ключевой визуальный элемент дашборда (из дизайн-образца).
 */
export function ProgressBar({
  value,
  showLabel = true,
  size = "md",
  className,
}: {
  value: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-2.5" };
  const labelSizes = {
    sm: "text-sm min-w-[38px]",
    md: "text-lg min-w-[48px]",
    lg: "text-xl min-w-[56px]",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showLabel && (
        <span
          className={cn(
            "font-bold tabular tracking-tight",
            labelSizes[size],
          )}
        >
          {value}%
        </span>
      )}
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-muted",
          heights[size],
        )}
      >
        <motion.div
          className="h-full rounded-full progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: [0.22, 0.7, 0.3, 1], delay: 0.1 }}
        />
      </div>
    </div>
  );
}
