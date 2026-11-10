import { ExternalLink, Hourglass } from "lucide-react";
import type { DocumentSummary } from "../../../../shared/document";
import { isSlowPdf } from "../../../../shared/documentFormats";
import { Button } from "../../components/Button";
import { formatBytes } from "./documentText";

/**
 * Very large PDFs stay blank for up to a minute while the viewer draws them,
 * which looks broken without a word.
 */
export function SlowPdfNotice({
  document,
}: {
  document: Pick<DocumentSummary, "id" | "extension" | "bytes">;
}) {
  if (!isSlowPdf(document.extension, document.bytes)) return null;
  return (
    <div className="slow-pdf-notice" role="status">
      <Hourglass aria-hidden size={16} />
      <p>
        Este PDF ocupa {formatBytes(document.bytes ?? 0)} y puede tardar hasta
        un minuto en aparecer.
      </p>
      <Button
        variant="subtle"
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
