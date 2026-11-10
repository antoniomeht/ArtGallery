import { X } from "lucide-react";
import { useState } from "react";
import type { DocumentDetail } from "../../../../shared/document";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { LinkTargetDialog } from "./LinkTargetDialog";

const LINK_LABELS = {
  artwork: "Obra",
  exhibition: "Exposición",
  collection: "Colección",
} as const;

interface DocumentLinksPanelProps {
  document: DocumentDetail;
  onChanged: () => void;
}

/** What a document is linked to, with ways to add and remove links. */
export function DocumentLinksPanel({
  document,
  onChanged,
}: DocumentLinksPanelProps) {
  const [isLinking, setIsLinking] = useState(false);

  return (
    <section className="document-links" aria-labelledby="document-links-title">
      <h2 id="document-links-title" className="document-links__title">
        Vinculado a
      </h2>
      {document.links.map((link) => (
        <div key={`${link.type}:${link.id}`} className="document-links__item">
          <span>
            {LINK_LABELS[link.type]} <strong>{link.label}</strong>
          </span>
          <IconButton
            aria-label={`Desvincular de «${link.label}»`}
            onClick={async () => {
              await window.artGallery.unlinkDocument(document.id, link);
              onChanged();
            }}
          >
            <X aria-hidden size={14} />
          </IconButton>
        </div>
      ))}
      <Button onClick={() => setIsLinking(true)}>+ Vincular…</Button>
      {isLinking && (
        <LinkTargetDialog
          documentTitle={document.title}
          onClose={() => setIsLinking(false)}
          onChoose={async (target) => {
            setIsLinking(false);
            await window.artGallery.linkDocuments([document.id], target);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

interface DocumentNotesFieldProps {
  document: DocumentDetail;
  onSave: (changes: { notes: string }) => void;
}

/** Notes for the user only; they never appear in exports. */
export function DocumentNotesField({
  document,
  onSave,
}: DocumentNotesFieldProps) {
  return (
    <label className="field">
      <span className="field__label">Notas internas</span>
      <textarea
        key={document.id}
        className="field__input document-view__notes"
        rows={4}
        maxLength={5000}
        defaultValue={document.notes ?? ""}
        onBlur={(event) => onSave({ notes: event.target.value })}
      />
    </label>
  );
}
