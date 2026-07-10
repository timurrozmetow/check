import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, FileSpreadsheet, Download, X } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import type { FileInfo } from "@/api/types";

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function docIcon(mime: string) {
  if (mime.includes("spreadsheet")) return FileSpreadsheet;
  return FileText;
}

/** Сетка превью изображений (лайтбокс) + строки документов со скачиванием. */
export function FileGrid({ files }: { files: FileInfo[] }) {
  const [lightbox, setLightbox] = useState<FileInfo | null>(null);
  if (files.length === 0) return null;

  const images = files.filter((f) => isImage(f.mime));
  const docs = files.filter((f) => !isImage(f.mime));

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(img)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              <img
                src={img.thumbUrl ?? img.url}
                alt={img.originalName}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => {
            const Icon = docIcon(doc.mime);
            return (
              <a
                key={doc.id}
                href={doc.url}
                download={doc.originalName}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-secondary"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {doc.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size)}
                  </p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      )}

      <Dialog
        open={lightbox !== null}
        onOpenChange={(o) => !o && setLightbox(null)}
      >
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          {lightbox && (
            <div className="relative">
              <img
                src={lightbox.url}
                alt={lightbox.originalName}
                className="max-h-[80vh] w-full rounded-xl object-contain"
              />
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Закрыть"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
