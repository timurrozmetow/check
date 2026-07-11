import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

/** Круговой индикатор сводного прогресса проекта. */
export function DonutProgress({
  value,
  size = 56,
  stroke = 6,
  color = "hsl(var(--primary))",
  title,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Подсказка при наведении (полезно, когда прогресс 0%). */
  title?: string;
}) {
  const { t } = useTranslation();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);
  const resolvedTitle = title ?? t("donutProgress.title");

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      title={`${resolvedTitle}: ${value}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 0.7, 0.3, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular">
        {value}%
      </span>
    </div>
  );
}
