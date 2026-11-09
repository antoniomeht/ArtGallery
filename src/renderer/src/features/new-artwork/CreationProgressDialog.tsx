import { useEffect, useRef } from "react";
import type { CreationProgress } from "../../../../shared/artwork";
import "./CreationProgressDialog.css";

/** Short additions finish before this, so the dialog never flashes. */
const SHOW_AFTER_MS = 500;

interface CreationProgressDialogProps {
  progress: CreationProgress;
}

/** Blocks the app while artworks are created from images. */
export function CreationProgressDialog({
  progress,
}: CreationProgressDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => dialogRef.current?.showModal(),
      SHOW_AFTER_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const { done, total, fileName } = progress;
  return (
    <dialog
      ref={dialogRef}
      className="dialog creation-dialog"
      role="alertdialog"
      aria-labelledby="creation-title"
      aria-describedby="creation-message"
      // Creating is all or nothing and cannot be interrupted. Chromium lets
      // a repeated Escape close the dialog anyway, so it opens again.
      onCancel={(event) => event.preventDefault()}
      onClose={() => dialogRef.current?.showModal()}
    >
      <div className="dialog__body creation-progress">
        <h2 id="creation-title" className="dialog__title">
          Añadiendo obras
        </h2>
        <p id="creation-message" className="dialog__message">
          Copiando y preparando las imágenes. No cierres la aplicación.
        </p>
        <progress
          className="creation-progress__bar"
          aria-label="Obras añadidas"
          value={done}
          max={total}
        />
        <div className="creation-progress__status">
          <strong>
            {done} de {total}
          </strong>
          <span className="creation-progress__file">{fileName}</span>
        </div>
      </div>
    </dialog>
  );
}
