import {
  ArrowLeft,
  Download,
  ExternalLink,
  FilePen,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  DocumentDetail,
  DocumentSummary,
} from "../../../../shared/document";
import {
  formatName,
  isViewableImage,
} from "../../../../shared/documentFormats";
import { documentFileUrl } from "../../../../shared/media";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useNavigation } from "../../components/Navigation";
import { setPendingImport } from "../editor/pendingImports";
import { DocumentLinksPanel, DocumentNotesField } from "./DocumentSidePanel";
import { DocumentBadge } from "./DocumentBadge";
import { formatBytes, formatDate } from "./documentText";
import { SlowPdfNotice } from "./SlowPdfNotice";
import { SpreadsheetPreview } from "./SpreadsheetPreview";
import { WordPreview } from "./WordPreview";

interface FileDocumentViewProps {
  documentId: string;
  onBack: () => void;
  onDelete: (document: DocumentSummary) => void;
}

/** An uploaded file: shown here when the app can, else opened outside. */
export function FileDocumentView({
  documentId,
  onBack,
  onDelete,
}: FileDocumentViewProps) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const { showDocuments } = useNavigation();

  const load = useCallback(() => {
    window.artGallery
      .getDocument(documentId)
      .then(setDocument, () => setFailed(true));
  }, [documentId]);
  useEffect(load, [load]);

  async function save(
    changes: Partial<Pick<DocumentDetail, "title" | "notes">>,
  ) {
    if (!document) return;
    const fields = { title: document.title, notes: document.notes, ...changes };
    if (!fields.title.trim()) return;
    setDocument(await window.artGallery.updateDocument(document.id, fields));
  }

  async function openOutside() {
    try {
      setOpenError(null);
      await window.artGallery.openDocumentExternally(documentId);
    } catch {
      setOpenError(
        "No hay ninguna aplicación en este equipo para abrir este archivo.",
      );
    }
  }

  /** A new text document from this Word file; the file stays as it is. */
  async function convertToText() {
    const imported = await window.artGallery.convertDocumentToText(documentId);
    setPendingImport(imported.documentId, imported.html);
    showDocuments({ openId: imported.documentId });
  }

  async function replace() {
    const replaced = await window.artGallery.replaceDocumentFile(documentId);
    if (replaced) setDocument(replaced);
  }

  if (failed) {
    return (
      <section className="document-view">
        <p className="documents__status" role="alert">
          No se pudo abrir este documento.
        </p>
        <Button onClick={onBack}>Volver a Documentación</Button>
      </section>
    );
  }
  if (!document) return null;

  const { extension, fileName } = document;
  const url = fileName ? documentFileUrl(fileName) : null;
  /** Converted here to look at; the file itself stays as it is. */
  const isReadInApp = extension === "docx" || extension === "xlsx";

  return (
    <section className="document-view" aria-label={document.title}>
      <header className="document-view__header">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft aria-hidden size={16} />
          Documentación
        </Button>
        <input
          key={document.updatedAt}
          className="document-view__title"
          aria-label="Título del documento"
          defaultValue={document.title}
          maxLength={300}
          onBlur={(event) => void save({ title: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <div className="toolbar">
          <Button onClick={() => void replace()}>
            <RefreshCw aria-hidden size={16} />
            Reemplazar archivo…
          </Button>
          <Button onClick={() => setIsConfirmingDelete(true)}>
            <Trash2 aria-hidden size={16} />
            Eliminar
          </Button>
          <Button
            variant="primary"
            onClick={() => void window.artGallery.saveDocumentAs(documentId)}
          >
            <Download aria-hidden size={16} />
            Descargar…
          </Button>
        </div>
      </header>

      <SlowPdfNotice document={document} />
      <div className="document-view__body">
        <div className="document-view__preview">
          {url && extension === "pdf" && (
            <iframe
              className="document-view__pdf"
              src={url}
              title={`Vista de ${document.title}`}
            />
          )}
          {url && isViewableImage(extension) && (
            <img
              className="document-view__image"
              src={url}
              alt={document.title}
            />
          )}
          {isReadInApp && (
            <div className="document-view__rendered">
              <div className="document-view__rendered-actions">
                <Button onClick={() => void openOutside()}>
                  <ExternalLink aria-hidden size={16} />
                  Abrir con {formatName(extension)}
                </Button>
                {extension === "docx" && (
                  <Button onClick={() => void convertToText()}>
                    <FilePen aria-hidden size={16} />
                    Convertir en documento editable
                  </Button>
                )}
              </div>
              {openError && (
                <p className="field__error" role="alert">
                  {openError}
                </p>
              )}
              {extension === "docx" ? (
                <WordPreview
                  documentId={document.id}
                  className="document-view__word-page"
                />
              ) : (
                <SpreadsheetPreview documentId={document.id} />
              )}
            </div>
          )}
          {extension !== "pdf" &&
            !isReadInApp &&
            !isViewableImage(extension) && (
              <div className="document-view__outside">
                <DocumentBadge extension={extension} />
                <p>
                  <strong>{document.originalName}</strong>
                  <br />
                  {formatName(extension)} · no se puede ver dentro de la app
                </p>
                <Button variant="primary" onClick={() => void openOutside()}>
                  <ExternalLink aria-hidden size={16} />
                  Abrir con la aplicación del sistema
                </Button>
                <p className="document-view__hint">
                  Se abre una copia. Si la cambias, usa «Reemplazar archivo»
                  para guardar aquí la nueva versión.
                </p>
                {openError && (
                  <p className="field__error" role="alert">
                    {openError}
                  </p>
                )}
              </div>
            )}
        </div>

        <aside
          className="document-view__aside"
          aria-label="Detalles del documento"
        >
          <DocumentLinksPanel document={document} onChanged={load} />
          <dl className="document-view__facts">
            <dt>Archivo</dt>
            <dd>{document.originalName}</dd>
            <dt>Formato</dt>
            <dd>{formatName(extension)}</dd>
            {document.bytes !== null && (
              <>
                <dt>Tamaño</dt>
                <dd>{formatBytes(document.bytes)}</dd>
              </>
            )}
            <dt>Subido</dt>
            <dd>{formatDate(document.createdAt)}</dd>
          </dl>
          {extension === "pdf" && (
            <Button variant="subtle" onClick={() => void openOutside()}>
              <ExternalLink aria-hidden size={16} />
              Abrir con la aplicación del sistema
            </Button>
          )}
          <DocumentNotesField document={document} onSave={save} />
        </aside>
      </div>

      {isConfirmingDelete && (
        <ConfirmDialog
          title="¿Eliminar este documento?"
          message={`«${document.title}» se eliminará de Documentación y de todo lo que lo vincule.`}
          confirmLabel="Eliminar"
          onConfirm={() => {
            setIsConfirmingDelete(false);
            onDelete(document);
          }}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </section>
  );
}
