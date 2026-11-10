import { FilePlus2, Link2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  DocumentLinkRef,
  DocumentSummary,
} from "../../../../shared/document";
import { formatName } from "../../../../shared/documentFormats";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { useNavigation } from "../../components/Navigation";
import { DocumentBadge } from "./DocumentBadge";
import { formatDate, uploadSummary } from "./documentText";
import { LinkDocumentDialog } from "./LinkDocumentDialog";
import "./DocumentsPage.css";

interface LinkedDocumentsProps {
  target: DocumentLinkRef;
  /** How the target is called, e.g. the artwork title. */
  targetLabel: string;
}

/** The documents of an artwork, exhibition or collection; changes are immediate. */
export function LinkedDocuments({ target, targetLabel }: LinkedDocumentsProps) {
  const { showDocuments, documentsVersion } = useNavigation();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [version, setVersion] = useState(0);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reload = () => setVersion((current) => current + 1);

  const { type, id } = target;

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listLinkedDocuments({ type, id })
      .then((list) => isCurrent && setDocuments(list));
    return () => {
      isCurrent = false;
    };
  }, [type, id, version, documentsVersion]);

  async function upload() {
    const paths = await window.artGallery.pickDocumentFiles();
    if (paths.length === 0) return;
    const result = await window.artGallery.uploadDocuments(paths);
    await window.artGallery.linkDocuments(
      result.added.map(({ id }) => id),
      target,
    );
    setMessage(uploadSummary(result).message);
    reload();
  }

  async function createText() {
    const created = await window.artGallery.createTextDocument(
      `Documento de ${targetLabel}`.slice(0, 300),
    );
    await window.artGallery.linkDocuments([created.id], target);
    showDocuments({ openId: created.id });
  }

  async function unlink(document: DocumentSummary) {
    await window.artGallery.unlinkDocument(document.id, target);
    reload();
  }

  return (
    <section className="linked-documents" aria-labelledby={`docs-${target.id}`}>
      <div className="linked-documents__header">
        <h3 id={`docs-${target.id}`} className="linked-documents__title">
          Documentos{" "}
          <span className="linked-documents__count">{documents.length}</span>
        </h3>
        <Button onClick={() => setIsLinking(true)}>
          <Link2 aria-hidden size={16} />
          Vincular existente…
        </Button>
        <Button onClick={() => void upload()}>
          <Upload aria-hidden size={16} />
          Subir archivo…
        </Button>
        <Button onClick={() => void createText()}>
          <FilePlus2 aria-hidden size={16} />
          Nuevo documento
        </Button>
      </div>
      {documents.length > 0 && (
        <ul className="linked-documents__list">
          {documents.map((document) => (
            <li key={document.id} className="linked-documents__row">
              <DocumentBadge extension={document.extension} />
              <button
                type="button"
                className="documents__title linked-documents__name"
                onClick={() => showDocuments({ openId: document.id })}
              >
                {document.title}
              </button>
              <span className="documents__detail">
                {formatName(document.extension)} ·{" "}
                {formatDate(document.updatedAt)}
              </span>
              <IconButton
                aria-label={`Desvincular «${document.title}»`}
                title="Desvincular"
                onClick={() => void unlink(document)}
              >
                <X aria-hidden size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p className="linked-documents__message" role="status">
          {message}
        </p>
      )}
      {isLinking && (
        <LinkDocumentDialog
          targetLabel={targetLabel}
          excludedIds={documents.map(({ id }) => id)}
          onClose={() => setIsLinking(false)}
          onChoose={async (ids) => {
            setIsLinking(false);
            await window.artGallery.linkDocuments(ids, target);
            reload();
          }}
        />
      )}
    </section>
  );
}
