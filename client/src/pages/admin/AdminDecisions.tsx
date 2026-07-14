import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Gavel,
  Layers,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ProjectChip } from "@/components/common/ProjectChip";
import { useDecisions } from "@/api/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DecisionRequestDetail, DecisionStatus } from "@/api/types";

const CARD_TRANSITION = { duration: 0.35, ease: [0.22, 0.7, 0.3, 1] as const };

/** Мягкий бейдж статуса запроса решения. */
function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "pending"
          ? "bg-warning/15 text-warning"
          : "bg-success/15 text-success",
      )}
    >
      {t(`decisionStatus.${status}`)}
    </span>
  );
}

function typeLabel(
  request: DecisionRequestDetail,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  return request.type === "choice"
    ? t("adminDecisions.typeChoice", { count: request.options.length })
    : t("adminDecisions.typeApproval");
}

/** Компактная карточка-сводка ожидающего запроса (без кнопок решения). */
const PendingCard = forwardRef<
  HTMLDivElement,
  { request: DecisionRequestDetail; index: number }
>(function PendingCard({ request, index }, ref) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ ...CARD_TRANSITION, delay: index * 0.05 }}
    >
      <Card className="rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectChip
            name={request.task.projectName}
            color={request.task.projectColor}
          />
          <DecisionStatusBadge status={request.status} />
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateTime(request.createdAt)}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-semibold">{request.title}</h3>
        {request.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {request.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            {typeLabel(request, t)}
          </span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">
            {t("adminDecisions.taskLabel", { title: request.task.title })}
          </span>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/tasks/${request.taskId}`)}
          >
            {t("adminDecisions.openTask")}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

/** Карточка решённого запроса с итогом решения директора. */
const DecidedCard = forwardRef<
  HTMLDivElement,
  { request: DecisionRequestDetail; index: number }
>(function DecidedCard({ request, index }, ref) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const selectedOption =
    request.type === "choice"
      ? request.options.find((o) => o.isSelected)
      : undefined;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ ...CARD_TRANSITION, delay: index * 0.05 }}
    >
      <Card className="rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectChip
            name={request.task.projectName}
            color={request.task.projectColor}
          />
          <DecisionStatusBadge status={request.status} />
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateTime(request.decidedAt)}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-semibold">{request.title}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Layers className="h-4 w-4 text-primary" />
            {typeLabel(request, t)}
          </span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">
            {t("adminDecisions.taskLabel", { title: request.task.title })}
          </span>
        </div>

        {/* Итог решения */}
        {request.type === "choice" ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            <Check className="h-4 w-4 shrink-0" />
            <span>
              {t("adminDecisions.selectedOption", {
                option: selectedOption?.title ?? t("adminDecisions.noOptionMarked"),
              })}
            </span>
          </div>
        ) : (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
              request.approved
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {request.approved ? (
              <ThumbsUp className="h-4 w-4 shrink-0" />
            ) : (
              <ThumbsDown className="h-4 w-4 shrink-0" />
            )}
            <span>
              {request.approved
                ? t("adminDecisions.approved")
                : t("adminDecisions.rejected")}
            </span>
          </div>
        )}

        {request.directorComment && (
          <div className="mt-3 rounded-xl bg-secondary/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("adminDecisions.directorComment")}
            </p>
            <p className="mt-1 text-sm">{request.directorComment}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/tasks/${request.taskId}`)}
          >
            {t("adminDecisions.openTask")}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
      {count}
    </span>
  );
}

function DecisionList({
  isLoading,
  items,
  variant,
}: {
  isLoading: boolean;
  items: DecisionRequestDetail[] | undefined;
  variant: "pending" | "decided";
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={Gavel}
        title={
          variant === "pending"
            ? t("adminDecisions.emptyPendingTitle")
            : t("adminDecisions.emptyDecidedTitle")
        }
        description={
          variant === "pending"
            ? t("adminDecisions.emptyPendingDesc")
            : t("adminDecisions.emptyDecidedDesc")
        }
      />
    );
  }

  return (
    <motion.div layout className="space-y-4">
      <AnimatePresence mode="popLayout">
        {items.map((req, i) =>
          variant === "pending" ? (
            <PendingCard key={req.id} request={req} index={i} />
          ) : (
            <DecidedCard key={req.id} request={req} index={i} />
          ),
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdminDecisions() {
  const { t } = useTranslation();
  const pending = useDecisions("pending");
  const decided = useDecisions("decided");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("adminDecisions.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("adminDecisions.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            {t("adminDecisions.tabPending")}
            <TabCount count={pending.data?.length ?? 0} />
          </TabsTrigger>
          <TabsTrigger value="decided">
            {t("adminDecisions.tabDecided")}
            <TabCount count={decided.data?.length ?? 0} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <DecisionList
            isLoading={pending.isLoading}
            items={pending.data}
            variant="pending"
          />
        </TabsContent>

        <TabsContent value="decided">
          <DecisionList
            isLoading={decided.isLoading}
            items={decided.data}
            variant="decided"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
