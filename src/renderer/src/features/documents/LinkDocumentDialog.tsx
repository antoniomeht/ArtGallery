import { useEffect, useRef, useState } from "react";
import type { DocumentSummary } from "../../../../shared/document";
import { Button } from "../../components/Button";
import { DocumentBadge } from "./DocumentBadge";

interface LinkDocumentDialogProps {
  targetLabel: string;
  /** Already linked, so not offered. */
  excludedIds: string[];
  onClose: () => void;
  onChoose: (documentIds: string[]) => void;
}

/** Picks existing documents to link to an artwork, exhibition or collection. */
export function LinkDocumentDialog({
  targetLabel,
  excludedIds,
  onClose,
  onChoose,
}: LinkDocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listDocuments({ text, sort: "title" })
      .then((list) => isCurrent && setDocuments(list));
    return () => {
      isCurrent = false;
    };
  }, [text]);

  const offered = documents?.filter(({ id }) => !excludedIds.includes(id));

  function toggle(id: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="link-document-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="link-document-title" className="dialog__title">
          Vincular documentos a «{targetLabel}»
        </h2>
        <input
          type="search"
          className="field__input"
          aria-label="Buscar documentos"
          placeholder="Buscar por título o notas"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {offered?.length === 0 && (
          <p className="dialog__message">
            No hay más documentos que vincular. Súbelos desde aquí o desde
            Documentación.
          </p>
        )}
        <fieldset className="choice-list">
          <legend className="visually-hidden">Documentos</legend>
          {offered?.map((document) => (
            <label key={document.id} className="checkbox link-choice">
              <input
                type="checkbox"
                checked={chosen.has(document.id)}
                onChange={() => toggle(document.id)}
              />
              <DocumentBadge extension={document.extension} />
              {document.title}
            </label>
          ))}
        </fieldset>
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={chosen.size === 0}
            onClick={() => onChoose([...chosen])}
          >
            Vincular
          </Button>
        </div>
      </div>
    </dialog>
  );
}
