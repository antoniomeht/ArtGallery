import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/Button";

interface TextPromptDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxLength: number;
  /** Shown only when editing something that can be removed. */
  onRemove?: () => void;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

/** Asks for a short text, such as a footnote or a comment. */
export function TextPromptDialog({
  title,
  label,
  initialValue = "",
  confirmLabel,
  maxLength,
  onRemove,
  onConfirm,
  onClose,
}: TextPromptDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="text-prompt-title"
      onClose={onClose}
    >
      <form className="dialog__body" onSubmit={submit}>
        <h2 id="text-prompt-title" className="dialog__title">
          {title}
        </h2>
        <label className="field">
          <span className="field__label">{label}</span>
          <textarea
            className="field__input"
            rows={3}
            autoFocus
            maxLength={maxLength}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <div className="dialog__actions">
          {onRemove && (
            <Button
              onClick={() => {
                onRemove();
                dialogRef.current?.close();
              }}
            >
              Quitar
            </Button>
          )}
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
