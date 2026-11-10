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
  initialContent,
  onChange,
}: {
  initialContent: DocumentDetail["content"];
  onChange: (content: unknown) => void;
}) {
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
      <EditorToolbar editor={editor} />
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
