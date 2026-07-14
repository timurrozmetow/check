import { Skeleton } from "@/components/ui/skeleton";

/**
 * Скелетон, повторяющий раскладку TaskCard: чип проекта + бейдж статуса,
 * заголовок, прогресс-бар, нижняя строка с приоритетом/датой и аватарами.
 * Так загрузка «занимает» ровно то же место, что и настоящая карточка —
 * без прыжков контента (layout shift).
 */
export function TaskCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <Skeleton className="h-2 w-full rounded-full" />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex -space-x-2">
          <Skeleton className="h-7 w-7 rounded-full border-2 border-card" />
          <Skeleton className="h-7 w-7 rounded-full border-2 border-card" />
          <Skeleton className="h-7 w-7 rounded-full border-2 border-card" />
        </div>
      </div>
    </div>
  );
}

/** Сетка из нескольких скелетон-карточек (по умолчанию 4). */
export function TaskCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}
