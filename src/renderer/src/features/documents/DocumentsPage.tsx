import { FileText, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from "react";
import type {
  DocumentKind,
  DocumentSummary,
} from "../../../../shared/document";
import { ActionNotice } from "../../components/ActionNotice";
import {
  useNavigation,
  type DocumentsRoute,
} from "../../components/Navigation";
import { LinkedFilter, type LinkedChoice } from "./LinkedFilter";
import { Button } from "../../components/Button";
import { useActionNotice } from "../../hooks/useActionNotice";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { DocumentBadge } from "./DocumentBadge";
import { formatBytes, formatDate, uploadSummary } from "./documentText";
import { setPendingImport } from "../editor/pendingImports";
import { DocumentView } from "./DocumentView";
import { DocumentPreview } from "./DocumentPreview";
import { formatName } from "../../../../shared/documentFormats";
import "./DocumentsPage.css";

type Sort = "recent" | "title";

const countLabel = (count: number) =>
  count === 1 ? "1 documento" : `${count} documentos`;

interface DocumentsPageProps {
  route: DocumentsRoute;
}

export function DocumentsPage({ route }: DocumentsPageProps) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<DocumentKind | "">("");
  const [sort, setSort] = useState<Sort>("recent");
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(route.openId ?? null);
  /** The row shown in the preview; the first one until another is chosen. */
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [linkedTo, setLinkedTo] = useState<LinkedChoice | null>(
    route.linkedTo ?? null,
  );
  const [version, setVersion] = useState(0);
  const appliedText = useDebouncedValue(text, 250);
  const { documentsVersion } = useNavigation();
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const { notice, setNotice } = useActionNotice(reload);

  useEffect(() => {
    let isCurrent = true;
    window.artGallery
      .listDocuments({
        text: appliedText,
        kind: kind || undefined,
        sort,
        linkedTo: linkedTo
          ? { type: linkedTo.type, id: linkedTo.id }
          : undefined,
      })
      .then(
        (list) => isCurrent && setDocuments(list),
        () => isCurrent && setFailed(true),
      );
    return () => {
      isCurrent = false;
    };
  }, [appliedText, kind, sort, linkedTo, version, documentsVersion]);

  async function upload() {
    const paths = await window.artGallery.pickDocumentFiles();
    if (paths.length === 0) return;
    const result = await window.artGallery.uploadDocuments(paths);
    setNotice({ message: uploadSummary(result).message });
    reload();
  }

  async function importWord() {
    const imported = await window.artGallery.importDocxAsText();
    if (!imported) return;
    setPendingImport(imported.documentId, imported.html);
    setOpenId(imported.documentId);
  }

  async function createText() {
    const created = await window.artGallery.createTextDocument(
      "Documento sin título",
    );
    setOpenId(created.id);
  }

  async function remove(document: DocumentSummary) {
    await window.artGallery.deleteDocument(document.id);
    setOpenId(null);
    reload();
    setNotice({
      message: `«${document.title}» eliminado.`,
      undo: async () => {
        await window.artGallery.restoreDocument(document.id);
        reload();
      },
    });
  }

  if (openId) {
    return (
      <>
        <DocumentView
          documentId={openId}
          onBack={() => {
            setOpenId(null);
            reload();
          }}
          onDelete={(document) => void remove(document)}
        />
        <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
      </>
    );
  }

  const isFiltering = Boolean(appliedText.trim() || kind || linkedTo);
  const previewId =
    documents?.find(({ id }) => id === chosenId)?.id ??
    documents?.[0]?.id ??
    null;

  /** Up and down arrows move the preview through the list. */
  function moveChoice(step: 1 | -1) {
    if (!documents || !previewId) return;
    const index = documents.findIndex(({ id }) => id === previewId);
    const next = documents[index + step];
    if (!next) return;
    setChosenId(next.id);
    window.document
      .querySelector<HTMLButtonElement>(`[data-document-row="${next.id}"]`)
      ?.focus();
  }

  return (
    <section className="documents" aria-labelledby="documents-title">
      <header className="page-header">
        <h1 id="documents-title" className="page-header__title">
          Documentación
        </h1>
        {documents && (
          <p className="page-header__count" aria-live="polite">
            {countLabel(documents.length)}
          </p>
        )}
        <div className="page-header__action toolbar">
          <Button onClick={() => void upload()}>
            <Upload aria-hidden size={16} />
            Subir archivo
          </Button>
          <Button onClick={() => void importWord()}>
            <FileText aria-hidden size={16} />
            Desde un Word…
          </Button>
          <Button variant="primary" onClick={() => void createText()}>
            <Plus aria-hidden size={16} />
            Nuevo documento
          </Button>
        </div>
      </header>

      <div className="documents__filters">
        <label className="gallery-search documents__search">
          <Search aria-hidden size={16} className="gallery-search__icon" />
          <span className="visually-hidden">Buscar documentos</span>
          <input
            type="search"
            className="field__input gallery-search__input"
            placeholder="Buscar por título o notas"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label>
          <span className="visually-hidden">Tipo</span>
          <select
            className="field__input"
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
          >
            <option value="">Todos los tipos</option>
            <option value="file">Archivos subidos</option>
            <option value="text">Documentos de texto</option>
          </select>
        </label>
        <LinkedFilter value={linkedTo} onChange={setLinkedTo} />
        <label className="documents__sort">
          Ordenar
          <select
            className="field__input"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            <option value="recent">Modificados recientemente</option>
            <option value="title">Título</option>
          </select>
        </label>
      </div>

      {failed && (
        <p className="documents__status" role="alert">
          No se pudieron leer los documentos.
        </p>
      )}

      {documents?.length === 0 && (
        <div className="documents__status">
          <p>
            {isFiltering
              ? "Ningún documento coincide con esta búsqueda."
              : "Aún no hay documentos. Sube PDF, imágenes, Word, Excel u otros archivos."}
          </p>
          {!isFiltering && (
            <Button onClick={() => void upload()}>
              <Upload aria-hidden size={16} />
              Subir archivo
            </Button>
          )}
        </div>
      )}

      {documents && documents.length > 0 && (
        <div className="documents__workspace">
          <table className="documents__table">
            <thead>
              <tr>
                <th scope="col" className="documents__type-cell">
                  Tipo
                </th>
                <th scope="col">Título</th>
                <th scope="col">Vinculado a</th>
                <th scope="col">Modificado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr
                  key={document.id}
                  className={
                    document.id === previewId
                      ? "documents__row--chosen"
                      : undefined
                  }
                  onClick={() => setChosenId(document.id)}
                  onDoubleClick={() => setOpenId(document.id)}
                >
                  <td>
                    <DocumentBadge extension={document.extension} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="documents__title"
                      data-document-row={document.id}
                      aria-current={
                        document.id === previewId ? "true" : undefined
                      }
                      title="Doble clic para abrir"
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowDown" ||
                          event.key === "ArrowUp"
                        ) {
                          event.preventDefault();
                          moveChoice(event.key === "ArrowDown" ? 1 : -1);
                        }
                      }}
                      onClick={() => setChosenId(document.id)}
                    >
                      {document.title}
                    </button>
                    <div className="documents__detail">
                      {formatName(document.extension)}
                      {document.bytes !== null &&
                        ` · ${formatBytes(document.bytes)}`}
                    </div>
                  </td>
                  <td className="documents__links">
                    {document.links.length === 0
                      ? "Sin vincular"
                      : document.links.map(({ label }) => label).join(" · ")}
                  </td>
                  <td className="documents__date">
                    {formatDate(document.updatedAt)}
                  </td>
                  <td>
                    <RowMenu
                      document={document}
                      onOpen={() => setOpenId(document.id)}
                      onChanged={reload}
                      onDelete={() => void remove(document)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {previewId && (
            <DocumentPreview
              documentId={previewId}
              onOpen={() => setOpenId(previewId)}
            />
          )}
        </div>
      )}

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}

function RowMenu({
  document,
  onOpen,
  onChanged,
  onDelete,
}: {
  document: DocumentSummary;
  onOpen: () => void;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const anchor = `--document-${id.replace(/\W/g, "")}`;
  const close = () => window.document.getElementById(id)?.hidePopover();
  const item = (label: string, action: () => void | Promise<unknown>) => (
    <button
      type="button"
      className="menu__item"
      role="menuitem"
      onClick={() => {
        close();
        void action();
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={`Más acciones de «${document.title}»`}
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        <MoreHorizontal aria-hidden size={18} />
      </button>
      <div
        id={id}
        popover="auto"
        role="menu"
        className="filter-panel menu"
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {item("Abrir", onOpen)}
        {document.kind === "file" &&
          item("Abrir con la aplicación del sistema", () =>
            window.artGallery.openDocumentExternally(document.id),
          )}
        {document.kind === "file" &&
          item("Descargar…", () =>
            window.artGallery.saveDocumentAs(document.id),
          )}
        {document.kind === "file" &&
          item("Reemplazar archivo…", async () => {
            await window.artGallery.replaceDocumentFile(document.id);
            onChanged();
          })}
        {item("Eliminar", onDelete)}
      </div>
    </>
  );
}
