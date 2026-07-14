import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, FileSpreadsheet, Download, X } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { downloadFile } from "@/api/upload";
import { RequestError } from "@/api/client";
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
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<FileInfo | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function download(file: FileInfo) {
    setDownloadingId(file.id);
    try {
      await downloadFile(file.id, file.originalName);
    } catch (e) {
      toast.error(
        e instanceof RequestError ? e.message : t("fileGrid.downloadError"),
      );
    } finally {
      setDownloadingId(null);
    }
  }

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
            const busy = downloadingId === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => download(doc)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary disabled:opacity-60"
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
                <Download
                  className={
                    "h-4 w-4 shrink-0 text-muted-foreground" +
                    (busy ? " animate-pulse" : "")
                  }
                />
              </button>
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
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => download(lightbox)}
                  aria-label={t("fileGrid.download")}
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  aria-label={t("common.close")}
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
