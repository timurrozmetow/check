import { cn } from "@/lib/utils";

/**
 * Плейсхолдер-скелетон с «переливающимся» бликом (shimmer).
 * Блик — псевдоэлемент before, едет слева направо поверх приглушённого фона.
 * Плавнее обычного pulse и одинаково смотрится в тёмной/светлой теме.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r",
        "before:from-transparent before:via-foreground/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
