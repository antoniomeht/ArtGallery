import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { ArrowLeft, Check, LoaderCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  DocumentDetail,
  DocumentSummary,
} from "../../../../shared/document";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  DocumentLinksPanel,
  DocumentNotesField,
} from "../documents/DocumentSidePanel";
import { EditorToolbar } from "./EditorToolbar";
import { FindBar } from "./FindBar";
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
        <Button onClick={() => setIsConfirmingDelete(true)}>
          <Trash2 aria-hidden size={16} />
          Eliminar
        </Button>
      </header>

      <div className="document-view__body">
        <TextEditor
          documentId={document.id}
          initialContent={document.content}
          onChange={autosave.schedule}
        />
        <aside
          className="document-view__aside"
          aria-label="Detalles del documento"
        >
          <DocumentLinksPanel document={document} onChanged={load} />
          <DocumentNotesField document={document} onSave={saveFields} />
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

function TextEditor({
  documentId,
  initialContent,
  onChange,
}: {
  documentId: string;
  initialContent: DocumentDetail["content"];
  onChange: (content: unknown) => void;
}) {
  const [find, setFind] = useState<"find" | "replace" | null>(null);
  const [isLinking, setIsLinking] = useState(false);
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

  if (!editor) return null;

  return (
    <div className="text-editor">
      <EditorToolbar
        editor={editor}
        documentId={documentId}
        onFind={() => setFind("find")}
        isLinking={isLinking}
        setIsLinking={setIsLinking}
      />
      {find && (
        <FindBar
          editor={editor}
          focusReplace={find === "replace"}
          onClose={() => setFind(null)}
        />
      )}
      <div className="text-editor__canvas">
        <div className="document-page">
          <EditorContent editor={editor} />
        </div>
      </div>
      <p className="text-editor__status">
        {words === 1 ? "1 palabra" : `${words} palabras`}
      </p>
    </div>
  );
}
