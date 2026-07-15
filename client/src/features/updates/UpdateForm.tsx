import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useCreateUpdate } from "@/api/hooks";
import { uploadFilesWithProgress } from "@/api/upload";
import { formatFileSize, cn } from "@/lib/utils";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

/** Форма отправки обновления по задаче: текст + перетаскивание файлов. */
export function UpdateForm({ taskId }: { taskId: number }) {
  const { t } = useTranslation();
  const create = useCreateUpdate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // uploading — именно фаза передачи файлов (не создание записи обновления),
  // чтобы полоска не висела на «0%», пока идёт первичный JSON-POST.
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Плашка «Отправлено» сама скрывается через несколько секунд.
  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => setSent(false), 3500);
    return () => clearTimeout(id);
  }, [sent]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  }

  async function submit() {
    if (busy) return; // защита от повторной отправки (дублей на модерации)
    if (text.trim().length < 3) {
      toast.error(t("updateForm.errTooShort"));
      return;
    }
    setBusy(true);
    setSent(false);
    setProgress(0);
    try {
      const res = await create.mutateAsync({ taskId, text: text.trim() });
      // Обновление уже создано на сервере. Загрузка файлов — вторичный шаг:
      // её провал НЕ должен выглядеть как провал отправки, иначе сотрудник
      // жмёт «Отправить» повторно и плодит дубли в очереди модерации.
      if (files.length > 0) {
        setUploading(true);
        try {
          await uploadFilesWithProgress(
            "task_update",
            res.update.id,
            files,
            // Прогресс только вперёд: при повторе после 401 новый XHR
            // стартует с 0, но полоска не должна прыгать назад.
            (p) => setProgress((prev) => Math.max(prev, p)),
          );
        } catch (e) {
          toast.warning(
            e instanceof RequestError
              ? t("updateForm.filesFailed", { msg: e.message })
              : t("updateForm.filesFailedGeneric"),
          );
        } finally {
          setUploading(false);
        }
      }
      qc.invalidateQueries({ queryKey: ["my-updates"] });
      // Обновляем ленту обновлений задачи (там теперь и вложения) после загрузки файлов.
      qc.invalidateQueries({ queryKey: ["task-updates", taskId] });
      setText("");
      setFiles([]);
      setSent(true);
      toast.success(t("updateForm.sentForReview"));
    } catch (e) {
      toast.error(
        e instanceof RequestError ? e.message : t("updateForm.submitFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={t("updateForm.textPlaceholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (sent) setSent(false);
        }}
        rows={3}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors",
          dragOver
            ? "border-primary bg-accent/40"
            : "border-border text-muted-foreground hover:bg-secondary/40",
        )}
      >
        <Paperclip className="h-5 w-5" />
        <span>{t("updateForm.dropzone")}</span>
        <span className="text-xs text-muted-foreground/70">
          {t("updateForm.dropzoneHint")}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.docx,.xlsx"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(f.size)}
              </span>
              <button
                type="button"
                aria-label={t("updateForm.removeFile")}
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Реальная полоска заполнения на фазе передачи файлов. Дойдя до 100%,
          переходим в неопределённое «Обработка…», пока сервер не ответит. */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            key="upload-progress"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                {progress >= 100
                  ? t("updateForm.processing")
                  : t("updateForm.uploading")}
              </span>
              <span className="tabular-nums text-primary">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className={cn("h-2", progress >= 100 && "animate-pulse")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-end gap-3">
        <AnimatePresence mode="wait">
          {busy && !uploading ? (
            <motion.div
              key="sending"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="mr-auto flex items-center gap-2 text-sm font-medium text-primary"
            >
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
              {t("updateForm.sending")}
            </motion.div>
          ) : sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="mr-auto flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success"
            >
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 500, damping: 18 }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </motion.span>
              {t("updateForm.sentBanner")}
              <span className="relative ml-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Button onClick={submit} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {busy ? t("updateForm.sending") : t("updateForm.submit")}
        </Button>
      </div>
    </div>
  );
}
