import { useEffect, useState } from "react";
import type {
  DocumentKind,
  DocumentSummary,
} from "../../../../shared/document";
import { Button } from "../../components/Button";
import { TextDocumentView } from "../editor/TextDocumentView";
import { FileDocumentView } from "./FileDocumentView";

interface DocumentViewProps {
  documentId: string;
  onBack: () => void;
  onDelete: (document: DocumentSummary) => void;
}

/** Opens an uploaded file or a text document, whichever it is. */
export function DocumentView(props: DocumentViewProps) {
  const [kind, setKind] = useState<DocumentKind | "missing" | null>(null);

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.getDocument(props.documentId).then(
      (document) => isCurrent && setKind(document.kind),
      () => isCurrent && setKind("missing"),
    );
    return () => {
      isCurrent = false;
    };
  }, [props.documentId]);

  if (kind === "missing") {
    return (
      <section className="document-view">
        <p className="documents__status" role="alert">
          No se pudo abrir este documento. Puede que se haya eliminado.
        </p>
        <Button onClick={props.onBack}>Volver a Documentación</Button>
      </section>
    );
  }
  if (kind === "text") return <TextDocumentView {...props} />;
  if (kind === "file") return <FileDocumentView {...props} />;
  return null;
}
