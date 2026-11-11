import { ExternalLink, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentDetail } from "../../../../shared/document";
import {
  formatName,
  isViewableImage,
} from "../../../../shared/documentFormats";
import { documentFileUrl } from "../../../../shared/media";
import { Button } from "../../components/Button";
import { DocumentBadge } from "./DocumentBadge";
import { formatBytes, formatDate } from "./documentText";
import { PdfFrame } from "./PdfFrame";
import { ReadOnlyText } from "./ReadOnlyText";
import { SlowPdfNotice } from "./SlowPdfNotice";
import { SpreadsheetPreview } from "./SpreadsheetPreview";
import { WordPreview } from "./WordPreview";

interface DocumentPreviewProps {
  documentId: string;
  onOpen: () => void;
}

type PreviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; document: DocumentDetail };

/** A look at the chosen document beside the list, without leaving it. */
export function DocumentPreview({ documentId, onOpen }: DocumentPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.getDocument(documentId).then(
      (document) => isCurrent && setState({ status: "ready", document }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [documentId]);

  if (state.status === "error") {
    return (
      <aside className="document-preview" aria-label="Vista previa">
        <p className="documents__status" role="alert">
          No se pudo leer este documento.
        </p>
      </aside>
    );
  }
  if (state.status === "loading") {
    return <aside className="document-preview" aria-label="Vista previa" />;
  }

  const { document } = state;
  return (
    <aside className="document-preview" aria-label="Vista previa">
      <header className="document-preview__header">
        <div>
          <h2 className="document-preview__title">{document.title}</h2>
          <p className="documents__detail">
            {formatName(document.extension)}
            {document.bytes !== null && ` · ${formatBytes(document.bytes)}`}
            {` · ${formatDate(document.updatedAt)}`}
          </p>
        </div>
        <Button variant="primary" onClick={onOpen}>
          <FolderOpen aria-hidden size={16} />
          Abrir
        </Button>
      </header>
      <SlowPdfNotice document={document} />
      <div className="document-preview__body">
        <PreviewBody key={document.id} document={document} />
      </div>
    </aside>
  );
}

function PreviewBody({ document }: { document: DocumentDetail }) {
  if (document.kind === "text") {
    return (
      <ReadOnlyText
        content={document.content}
        className="document-preview__text"
      />
    );
  }

  const { extension, fileName } = document;
  const url = fileName ? documentFileUrl(fileName) : null;
  if (url && extension === "pdf") {
    return (
      <PdfFrame
        className="document-preview__pdf"
        src={`${url}#toolbar=0&view=FitH`}
        title={`Vista previa de ${document.title}`}
      />
    );
  }
  if (extension === "docx") {
    return (
      <WordPreview
        documentId={document.id}
        className="document-preview__text"
      />
    );
  }
  if (extension === "xlsx") {
    return <SpreadsheetPreview documentId={document.id} />;
  }
  if (url && isViewableImage(extension)) {
    return (
      <img className="document-preview__image" src={url} alt={document.title} />
    );
  }
  return (
    <div className="document-preview__outside">
      <DocumentBadge extension={extension} />
      <p>{formatName(extension)} · no se puede ver dentro de la app</p>
      <Button
        onClick={() =>
          void window.artGallery
            .openDocumentExternally(document.id)
            .catch(() => {})
        }
      >
        <ExternalLink aria-hidden size={16} />
        Abrir con la aplicación del sistema
      </Button>
    </div>
  );
}
