import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import {
  ArrowLeft,
  Check,
  FileDown,
  FileText,
  LoaderCircle,
  Printer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type {
  DocumentDetail,
  DocumentSummary,
} from "../../../../shared/document";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MoreMenu } from "../../components/MoreMenu";
import {
  DocumentLinksPanel,
  DocumentNotesField,
} from "../documents/DocumentSidePanel";
import { CommentsPanel } from "./CommentsPanel";
import { EditorToolbar } from "./EditorToolbar";
import {
  DEFAULT_PAGE_SETUP,
  MARGINS_MM,
  pageSize,
  type PageSetup,
} from "../../../../shared/pageSetup";
import { FindBar } from "./FindBar";
import { takePendingImport } from "./pendingImports";
import { PageSetupDialog, pageSetupSummary } from "./PageSetupDialog";
import { TextPromptDialog } from "./TextPromptDialog";
import { createEditorExtensions } from "./extensions";
import { useAutosave, type SaveStatus } from "./useAutosave";
import "./editor.css";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Guardado",
  saving: "Guardando…",
  error: "No se pudo guardar. Se reintentará al seguir escribiendo.",
};

interface TextDocumentViewProps {
  documentId: string;
  onBack: () => void;
  onDelete: (document: DocumentSummary) => void;
}

/** A document written in the app, edited like a Word page. */
export function TextDocumentView({
  documentId,
  onBack,
  onDelete,
}: TextDocumentViewProps) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const load = useCallback(() => {
    void window.artGallery.getDocument(documentId).then(setDocument);
  }, [documentId]);
  useEffect(load, [load]);

  const autosave = useAutosave((content: unknown) =>
    window.artGallery.saveDocumentContent(documentId, content),
  );

  async function saveFields(changes: { title?: string; notes?: string }) {
    if (!document) return;
    const fields = { title: document.title, notes: document.notes, ...changes };
    if (!fields.title.trim()) return;
    setDocument(await window.artGallery.updateDocument(document.id, fields));
  }

  if (!document) return null;
  const setup = document.pageSetup ?? DEFAULT_PAGE_SETUP;

  return (
    <section className="document-view" aria-label={document.title}>
      <header className="document-view__header">
        <Button
          variant="subtle"
          onClick={async () => {
            await autosave.flush();
            onBack();
          }}
        >
          <ArrowLeft aria-hidden size={16} />
          Documentación
        </Button>
        <input
          className="document-view__title"
          aria-label="Título del documento"
          defaultValue={document.title}
          maxLength={300}
          onBlur={(event) => void saveFields({ title: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <p
          className={`save-status save-status--${autosave.status}`}
          role="status"
        >
          {autosave.status === "saved" && <Check aria-hidden size={14} />}
          {autosave.status === "saving" && (
            <LoaderCircle aria-hidden size={14} className="spin" />
          )}
          {STATUS_TEXT[autosave.status]}
        </p>
        <MoreMenu
          label="Más acciones del documento"
          items={[
            {
              label: "Exportar a Word…",
              icon: FileText,
              onSelect: async () => {
                await autosave.flush();
                await window.artGallery.exportDocumentDocx(document.id);
              },
            },
            {
              label: "Eliminar",
              icon: Trash2,
              onSelect: () => setIsConfirmingDelete(true),
            },
          ]}
        />
        <Button
          onClick={async () => {
            await autosave.flush();
            await window.artGallery.printTextDocument(document.id);
          }}
        >
          <Printer aria-hidden size={16} />
          Imprimir…
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            await autosave.flush();
            await window.artGallery.exportDocumentPdf(document.id);
          }}
        >
          <FileDown aria-hidden size={16} />
          Descargar PDF
        </Button>
      </header>

      <div className="document-view__body">
        <TextEditor
          documentId={document.id}
          pageSetup={setup}
          onEditPageSetup={() => setIsEditingPage(true)}
          initialContent={document.content}
          onChange={autosave.schedule}
          onEditor={setEditor}
          onCommentAdded={() => setCommentsVersion((current) => current + 1)}
        />
        <aside
          className="document-view__aside"
          aria-label="Detalles del documento"
        >
          <DocumentLinksPanel document={document} onChanged={load} />
          <DocumentNotesField document={document} onSave={saveFields} />
          {editor && (
            <CommentsPanel
              documentId={document.id}
              editor={editor}
              version={autosave.savedVersion + commentsVersion}
            />
          )}
        </aside>
      </div>

      {isEditingPage && (
        <PageSetupDialog
          setup={setup}
          onSave={async (next) =>
            setDocument(
              await window.artGallery.savePageSetup(document.id, next),
            )
          }
          onClose={() => setIsEditingPage(false)}
        />
      )}
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

function TextEditor({
  documentId,
  pageSetup,
  onEditPageSetup,
  initialContent,
  onChange,
  onEditor,
  onCommentAdded,
}: {
  documentId: string;
  pageSetup: PageSetup;
  onEditPageSetup: () => void;
  initialContent: DocumentDetail["content"];
  onChange: (content: unknown) => void;
  onEditor: (editor: Editor | null) => void;
  onCommentAdded: () => void;
}) {
  const [find, setFind] = useState<"find" | "replace" | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [footnote, setFootnote] = useState<{
    pos: number;
    text: string;
  } | null>(null);
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class: "document-page__content",
        "aria-label": "Contenido del documento",
        spellcheck: "true",
        lang: "es",
      },
      // Ctrl+click opens a link in the browser, as in Word.
      handleClick: (_view, _pos, event) => {
        const link = (event.target as Element).closest("a[href]");
        if (!link || !(event.ctrlKey || event.metaKey)) return false;
        window.open(link.getAttribute("href") ?? "", "_blank");
        return true;
      },
      // Clicking a footnote number opens its text for editing.
      handleClickOn: (_view, pos, node) => {
        if (node.type.name !== "footnote") return false;
        setFootnote({ pos, text: String(node.attrs.text ?? "") });
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (!(event.ctrlKey || event.metaKey)) return false;
        const key = event.key.toLowerCase();
        if (key === "k") setIsLinking(true);
        else if (key === "f") setFind("find");
        else if (key === "h") setFind("replace");
        else return false;
        event.preventDefault();
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });
  const words = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current?.storage.characterCount.words() ?? 0,
  });

  useEffect(() => {
    onEditor(editor);
    return () => onEditor(null);
  }, [editor, onEditor]);

  // A document just made from a Word file loads its text once, then saves.
  useEffect(() => {
    const html = editor ? takePendingImport(documentId) : null;
    if (editor && html) editor.commands.setContent(html, { emitUpdate: true });
  }, [editor, documentId]);

  if (!editor) return null;

  return (
    <div className="text-editor">
      <EditorToolbar
        editor={editor}
        documentId={documentId}
        onFind={() => setFind("find")}
        isLinking={isLinking}
        setIsLinking={setIsLinking}
        onCommentAdded={onCommentAdded}
      />
      {find && (
        <FindBar
          editor={editor}
          focusReplace={find === "replace"}
          onClose={() => setFind(null)}
        />
      )}
      <div className="text-editor__canvas">
        <div className="document-page" style={pageStyle(pageSetup)}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="text-editor__status">
        <span>{words === 1 ? "1 palabra" : `${words} palabras`}</span>
        <button
          type="button"
          className="text-editor__page-setup"
          onClick={onEditPageSetup}
        >
          Diseño de página: {pageSetupSummary(pageSetup)}
        </button>
      </div>
      {footnote && (
        <TextPromptDialog
          title="Nota al pie"
          label="Texto de la nota"
          initialValue={footnote.text}
          confirmLabel="Guardar"
          maxLength={2000}
          onRemove={() =>
            editor
              .chain()
              .focus()
              .deleteRange({ from: footnote.pos, to: footnote.pos + 1 })
              .run()
          }
          onConfirm={(text) =>
            editor.chain().focus().updateFootnote(footnote.pos, text).run()
          }
          onClose={() => setFootnote(null)}
        />
      )}
    </div>
  );
}

/** The sheet on screen has the size and margins it will print with. */
function pageStyle(setup: PageSetup): CSSProperties {
  const { width, height } = pageSize(setup);
  return {
    "--page-width": `${width}mm`,
    "--page-height": `${height}mm`,
    "--page-margin": `${MARGINS_MM[setup.margins]}mm`,
  } as CSSProperties;
}
