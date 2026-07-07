import { cn } from "@/lib/utils";

/** Логотип DirectorHub — градиентный квадрат «D» + название (как в дизайн-образце). */
export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-primary-glow to-primary text-[15px] font-extrabold text-white shadow-[0_2px_10px_hsl(var(--primary)/0.45)]">
        D
      </div>
      {!compact && (
        <span className="text-base font-bold tracking-tight">DirectorHub</span>
      )}
    </div>
  );
}
