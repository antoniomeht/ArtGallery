import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { isSafeHref } from "../../../../shared/editorSchema";
import { Button } from "../../components/Button";

/** "museo.es" becomes "https://museo.es"; an email gets "mailto:". */
export function normalizeHref(text: string): string {
  const value = text.trim();
  if (!value || isSafeHref(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

interface LinkDialogProps {
  editor: Editor;
  onClose: () => void;
}

/** Adds, changes or removes the link of the selected text (Ctrl+K). */
export function LinkDialog({ editor, onClose }: LinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current =
    (editor.getAttributes("link").href as string | undefined) ?? "";
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function apply(event: FormEvent) {
    event.preventDefault();
    const href = normalizeHref(value);
    if (!isSafeHref(href)) {
      setError("Escribe una dirección web o un correo electrónico.");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !current) {
      chain
        .insertContent({
          type: "text",
          text: value.trim(),
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      chain.setLink({ href }).run();
    }
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="link-dialog-title"
      onClose={onClose}
    >
      <form className="dialog__body" onSubmit={apply}>
        <h2 id="link-dialog-title" className="dialog__title">
          Enlace
        </h2>
        <label className="field">
          <span className="field__label">Dirección web o correo</span>
          <input
            className="field__input"
            autoFocus
            placeholder="https://… o nombre@correo.es"
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
        </label>
        <p className="dialog__message">
          Para abrir un enlace del documento, pulsa Ctrl y haz clic en él.
        </p>
        <div className="dialog__actions">
          {current && (
            <Button
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                dialogRef.current?.close();
              }}
            >
              Quitar enlace
            </Button>
          )}
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button type="submit" variant="primary">
            Aplicar
          </Button>
        </div>
      </form>
    </dialog>
  );
}
