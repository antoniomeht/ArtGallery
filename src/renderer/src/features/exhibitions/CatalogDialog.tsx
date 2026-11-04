import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";

interface CatalogDialogProps {
  exhibitionId: string;
  onClose: () => void;
  onSaved: (path: string) => void;
}

/** Options for the exhibition catalogue before choosing where to save it. */
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
      const result = await window.artGallery.exportCatalogPdf(exhibitionId, {
        includePrices,
      });
      if (result) onSaved(result.path);
      else setIsSaving(false);
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
          orden con su miniatura y su cartela, en hojas A4.
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
            {isSaving ? "Generando PDF…" : "Guardar PDF…"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
