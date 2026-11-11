import { useEffect, useRef, useState } from "react";
import type { DocumentDetail } from "../../../../shared/document";
import { Button } from "../../components/Button";

interface CatalogDialogProps {
  exhibitionId: string;
  onClose: () => void;
  onSaved: (document: DocumentDetail) => void;
}

/** Options for the exhibition catalogue, which is kept in Documentación. */
export function CatalogDialog({
  exhibitionId,
  onClose,
  onSaved,
}: CatalogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [includePrices, setIncludePrices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function save() {
    setIsSaving(true);
    setFailed(false);
    try {
      onSaved(
        await window.artGallery.saveCatalogPdf(exhibitionId, {
          includePrices,
        }),
      );
    } catch {
      setFailed(true);
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="catalog-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="catalog-title" className="dialog__title">
          Catálogo en PDF
        </h2>
        <p className="dialog__message">
          Una portada con los datos de la exposición y, después, cada obra en
          orden con su miniatura y su cartela, en hojas A4. Se guarda en
          Documentación, vinculado a esta exposición.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={includePrices}
            onChange={(event) => setIncludePrices(event.target.checked)}
          />
          Incluir precios
        </label>
        {failed && (
          <p className="dialog__error" role="alert">
            No se pudo generar el PDF. Inténtalo de nuevo.
          </p>
        )}
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button variant="primary" disabled={isSaving} onClick={save}>
            {isSaving ? "Generando PDF…" : "Guardar en Documentación"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
