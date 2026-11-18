import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Names the action, e.g. "Quitar imagen". */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Names the way back, "Cancelar" by default. */
  cancelLabel?: string;
  /** A safe way forward, e.g. saving before leaving; shown as the main one. */
  alternative?: { label: string; onClick: () => void };
}

/** Modal confirmation for actions that remove data. Cancel has focus. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Cancelar",
  alternative,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onCancel}
    >
      <div className="dialog__body">
        <h2 id="confirm-title" className="dialog__title">
          {title}
        </h2>
        <p id="confirm-message" className="dialog__message">
          {message}
        </p>
        <div className="dialog__actions">
          <Button autoFocus onClick={() => dialogRef.current?.close()}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          {alternative && (
            <Button variant="primary" onClick={alternative.onClick}>
              {alternative.label}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
