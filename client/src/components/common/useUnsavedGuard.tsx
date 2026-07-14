import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Защита формы от случайного закрытия с несохранёнными данными.
 * Перехватывает закрытие диалога по Escape и клику мимо: если форма «грязная»
 * (dirty), показывает подтверждение вместо мгновенного закрытия.
 *
 * Важно: перехватчик только отменяет авто-закрытие и открывает подтверждение —
 * сам форму он не закрывает, поэтому случайная потеря данных невозможна даже
 * при наложении слоёв. Явные кнопки «Отмена»/сабмит закрывают напрямую.
 *
 * Использование:
 *   const dirty = title !== "" || ...;
 *   const { guardProps, confirmDialog } = useUnsavedGuard(dirty, () => {
 *     reset(); setOpen(false);
 *   });
 *   <DialogContent {...guardProps}> ... </DialogContent>
 *   {confirmDialog}
 */
export function useUnsavedGuard(
  dirty: boolean,
  close: () => void,
): { guardProps: GuardProps; confirmDialog: ReactNode } {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function intercept(e: { preventDefault: () => void }) {
    if (dirty) {
      e.preventDefault();
      setConfirmOpen(true);
    }
  }

  const guardProps: GuardProps = {
    onEscapeKeyDown: intercept,
    onInteractOutside: intercept,
  };

  const confirmDialog = (
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      destructive
      title={t("unsavedChanges.title")}
      description={t("unsavedChanges.description")}
      confirmLabel={t("unsavedChanges.confirm")}
      cancelLabel={t("unsavedChanges.cancel")}
      onConfirm={() => {
        setConfirmOpen(false);
        close();
      }}
    />
  );

  return { guardProps, confirmDialog };
}

interface GuardProps {
  onEscapeKeyDown: (e: { preventDefault: () => void }) => void;
  onInteractOutside: (e: { preventDefault: () => void }) => void;
}
