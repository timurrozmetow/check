import { CheckCircle2, Gavel } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DecisionCard } from "@/features/decisions/DecisionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useDecisions } from "@/api/hooks";
import { useTranslation } from "react-i18next";

export function DirectorDecisions() {
  const { t } = useTranslation();
  const pending = useDecisions("pending");
  const decided = useDecisions("decided");

  return (
    <div className="mx-auto max-w-4xl">
      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="gap-2">
            <Gavel className="h-4 w-4" />
            {t("directorDecisions.pendingTab")}
            {(pending.data?.length ?? 0) > 0 && (
              <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {pending.data?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="decided" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t("directorDecisions.decidedTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.isLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (pending.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t("directorDecisions.pendingEmptyTitle")}
              description={t("directorDecisions.pendingEmptyDesc")}
            />
          ) : (
            pending.data?.map((req, i) => (
              <DecisionCard key={req.id} request={req} index={i} />
            ))
          )}
        </TabsContent>

        <TabsContent value="decided" className="space-y-4">
          {decided.isLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (decided.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Gavel} title={t("directorDecisions.decidedEmptyTitle")} />
          ) : (
            decided.data?.map((req, i) => (
              <DecisionCard key={req.id} request={req} index={i} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
