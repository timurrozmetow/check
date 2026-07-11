import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProjectChip } from "@/components/common/ProjectChip";
import { FileGrid } from "@/features/tasks/FileGrid";
import { useDecide } from "@/api/hooks";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import { cn } from "@/lib/utils";
import type { DecisionRequestDetail } from "@/api/types";

/** Крупная карточка решения для директора: выбор варианта или согласование. */
export function DecisionCard({
  request,
  index = 0,
}: {
  request: DecisionRequestDetail;
  index?: number;
}) {
  const { t } = useTranslation();
  const decide = useDecide();
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const decided = request.status === "decided";

  async function submitChoice(optionId: number) {
    setSelected(optionId);
    try {
      await decide.mutateAsync({ id: request.id, optionId, comment: comment || undefined });
      toast.success(t("decisionCard.decisionMade"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
      setSelected(null);
    }
  }

  async function submitApproval(approved: boolean) {
    try {
      await decide.mutateAsync({
        id: request.id,
        approved,
        comment: comment || undefined,
      });
      toast.success(approved ? t("decisionCard.approved") : t("decisionCard.rejected"));
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : t("common.error"));
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="border-b border-border p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ProjectChip
            name={request.task.projectName}
            color={request.task.projectColor}
          />
          <span className="text-xs text-muted-foreground">
            {t("decisionCard.taskLabel", { title: request.task.title })}
          </span>
        </div>
        <h2 className="text-xl font-bold sm:text-2xl">{request.title}</h2>
        {request.description && (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {request.description}
          </p>
        )}
        {request.files.length > 0 && (
          <div className="mt-4">
            <FileGrid files={request.files} />
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {request.type === "choice" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {request.options.map((opt) => {
              const isChosen = opt.isSelected;
              const isPending = selected === opt.id && decide.isPending;
              return (
                <div
                  key={opt.id}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-xl border transition-colors",
                    isChosen
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border",
                  )}
                >
                  {opt.files.filter((f) => f.mime.startsWith("image/"))[0] && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={
                          opt.files.find((f) => f.mime.startsWith("image/"))
                            ?.thumbUrl ??
                          opt.files.find((f) => f.mime.startsWith("image/"))?.url
                        }
                        alt={opt.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{opt.title}</h3>
                      {opt.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {opt.description}
                        </p>
                      )}
                    </div>
                    {decided ? (
                      isChosen ? (
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-sm font-semibold text-primary">
                          <Check className="h-4 w-4" />
                          {t("decisionCard.chosen")}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                          {t("decisionCard.notChosen")}
                        </div>
                      )
                    ) : (
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={decide.isPending}
                        onClick={() => submitChoice(opt.id)}
                      >
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t("decisionCard.chooseOption")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            {decided ? (
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold",
                  request.approved
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {request.approved ? (
                  <ThumbsUp className="h-5 w-5" />
                ) : (
                  <ThumbsDown className="h-5 w-5" />
                )}
                {request.approved ? t("decisionCard.approved") : t("decisionCard.rejected")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-14 text-base"
                  disabled={decide.isPending}
                  onClick={() => submitApproval(true)}
                >
                  <ThumbsUp className="mr-2 h-5 w-5" />
                  {t("decisionCard.approve")}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 text-base"
                  disabled={decide.isPending}
                  onClick={() => submitApproval(false)}
                >
                  <ThumbsDown className="mr-2 h-5 w-5" />
                  {t("decisionCard.reject")}
                </Button>
              </div>
            )}
          </div>
        )}

        {!decided && (
          <div className="mt-5">
            <Textarea
              placeholder={t("decisionCard.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {decided && request.directorComment && (
          <div className="mt-4 rounded-xl bg-secondary/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("decisionCard.directorComment")}
            </p>
            <p className="mt-1 text-sm">{request.directorComment}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
