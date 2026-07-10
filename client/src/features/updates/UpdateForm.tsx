import { useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateUpdate } from "@/api/hooks";
import { uploadFiles } from "@/api/upload";
import { formatFileSize, cn } from "@/lib/utils";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";

/** Форма отправки обновления по задаче: текст + перетаскивание файлов. */
export function UpdateForm({ taskId }: { taskId: number }) {
  const create = useCreateUpdate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  }

  async function submit() {
    if (text.trim().length < 3) {
      toast.error("Сообщение слишком короткое");
      return;
    }
    setBusy(true);
    try {
      const res = await create.mutateAsync({ taskId, text: text.trim() });
      if (files.length > 0) {
        await uploadFiles("task_update", res.update.id, files);
      }
      qc.invalidateQueries({ queryKey: ["my-updates"] });
      toast.success("Обновление отправлено на проверку");
      setText("");
      setFiles([]);
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Опишите, что сделано по задаче…"
        value={text}
        onChange={(e) => setText(e.target.value)}
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
        <span>Перетащите файлы сюда или нажмите, чтобы выбрать</span>
        <span className="text-xs text-muted-foreground/70">
          Фото, PDF, Word, Excel · до 20 МБ
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
                aria-label="Удалить файл"
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Отправить
        </Button>
      </div>
    </div>
  );
}
