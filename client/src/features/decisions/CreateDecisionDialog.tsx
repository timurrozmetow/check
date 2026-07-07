import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useCreateDecision } from "@/api/hooks";
import { uploadFiles } from "@/api/upload";
import { toast } from "sonner";
import { RequestError } from "@/api/client";
import type { ReactNode } from "react";

interface OptionDraft {
  title: string;
  description: string;
  files: File[];
}

/** Диалог создания запроса решения директора (выбор вариантов / согласование). */
export function CreateDecisionDialog({
  taskId,
  trigger,
}: {
  taskId: number;
  trigger: ReactNode;
}) {
  const create = useCreateDecision();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"choice" | "approval">("choice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([
    { title: "", description: "", files: [] },
    { title: "", description: "", files: [] },
  ]);
  const [busy, setBusy] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setType("choice");
    setOptions([
      { title: "", description: "", files: [] },
      { title: "", description: "", files: [] },
    ]);
  }

  async function submit() {
    if (title.trim().length < 1) {
      toast.error("Укажите заголовок");
      return;
    }
    if (type === "choice") {
      const filled = options.filter((o) => o.title.trim().length > 0);
      if (filled.length < 2) {
        toast.error("Нужно минимум два варианта");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await create.mutateAsync({
        taskId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        options:
          type === "choice"
            ? options
                .filter((o) => o.title.trim())
                .map((o) => ({
                  title: o.title.trim(),
                  description: o.description.trim() || undefined,
                }))
            : undefined,
      });
      // Загрузить фото вариантов (по порядку соответствия)
      if (type === "choice") {
        const filled = options.filter((o) => o.title.trim());
        await Promise.all(
          res.request.options.map((opt, i) =>
            filled[i]?.files.length
              ? uploadFiles("decision_option", opt.id, filled[i]!.files)
              : Promise.resolve([]),
          ),
        );
      }
      toast.success("Запрос решения отправлен директору");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof RequestError ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Запрос решения директора</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
          <TabsList className="w-full">
            <TabsTrigger value="choice" className="flex-1">
              Выбор варианта
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex-1">
              Согласование
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Заголовок</Label>
              <Input
                placeholder="Например: Выбор кофемашины"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Описание (необязательно)</Label>
              <Textarea
                placeholder="Поясните суть вопроса…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <TabsContent value="choice" className="space-y-3">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Вариант {i + 1}
                    </span>
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((p) => p.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Название варианта"
                    value={opt.title}
                    onChange={(e) =>
                      setOptions((p) =>
                        p.map((o, j) =>
                          j === i ? { ...o, title: e.target.value } : o,
                        ),
                      )
                    }
                  />
                  <Input
                    placeholder="Детали: цена, срок, гарантия…"
                    value={opt.description}
                    onChange={(e) =>
                      setOptions((p) =>
                        p.map((o, j) =>
                          j === i ? { ...o, description: e.target.value } : o,
                        ),
                      )
                    }
                  />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      setOptions((p) =>
                        p.map((o, j) =>
                          j === i
                            ? {
                                ...o,
                                files: Array.from(e.target.files ?? []),
                              }
                            : o,
                        ),
                      )
                    }
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                  {opt.files.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Прикреплено фото: {opt.files.length}
                    </p>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setOptions((p) => [
                      ...p,
                      { title: "", description: "", files: [] },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить вариант
                </Button>
              )}
            </TabsContent>

            <TabsContent value="approval">
              <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                Директор увидит две кнопки: «Согласовать» и «Отклонить».
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Отправить директору
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
