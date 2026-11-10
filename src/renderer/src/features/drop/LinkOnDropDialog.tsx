import { useEffect, useRef } from "react";
import type { DocumentLinkType } from "../../../../shared/document";
import { Button } from "../../components/Button";
import type { PendingLink } from "./useDocumentDrop";

const TARGET_NAMES: Record<DocumentLinkType, string> = {
  artwork: "esta obra",
  exhibition: "esta exposición",
  collection: "esta colección",
};

interface LinkOnDropDialogProps {
  pending: PendingLink;
  onDecide: (link: boolean) => void;
}

/** Asks whether documents dropped on something should be linked to it. */
export function LinkOnDropDialog({ pending, onDecide }: LinkOnDropDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const decided = useRef(false);
  const { added } = pending.result;
  const decide = (link: boolean) => {
    if (decided.current) return;
    decided.current = true;
    onDecide(link);
  };

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const many = added.length > 1;
  const names = added.map(({ originalName, title }) => originalName ?? title);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby="link-drop-title"
      aria-describedby="link-drop-message"
      // Escape answers "No vincular".
      onClose={() => decide(false)}
    >
      <div className="dialog__body">
        <h2 id="link-drop-title" className="dialog__title">
          ¿Vincular {many ? `los ${added.length} documentos` : "el documento"} a{" "}
          {TARGET_NAMES[pending.target.type]}?
        </h2>
        <p className="link-drop__target">{pending.label}</p>
        <p id="link-drop-message" className="dialog__message">
          {many
            ? `${names.join(", ")} ya están en Documentación.`
            : `«${names[0]}» ya está en Documentación.`}{" "}
          Si {many ? "los vinculas, aparecerán" : "lo vinculas, aparecerá"}{" "}
          también en {TARGET_NAMES[pending.target.type]}.
        </p>
        <div className="dialog__actions">
          <Button autoFocus onClick={() => dialogRef.current?.close()}>
            No vincular
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              decide(true);
              dialogRef.current?.close();
            }}
          >
            Vincular
          </Button>
        </div>
      </div>
    </dialog>
  );
}
