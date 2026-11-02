import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Names the action, e.g. "Quitar imagen". */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation for actions that remove data. Cancel has focus. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
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
          <button
            type="button"
            className="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
