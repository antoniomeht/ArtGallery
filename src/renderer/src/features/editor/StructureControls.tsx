import { useEditorState, type Editor } from "@tiptap/react";
import { ListTree, MessageSquarePlus } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { TextPromptDialog } from "./TextPromptDialog";

interface StructureControlsProps {
  editor: Editor;
  documentId: string;
  onCommentAdded: () => void;
}

/** "Insertar ▾" (index, footnote, columns) and adding a comment. */
export function StructureControls({
  editor,
  documentId,
  onCommentAdded,
}: StructureControlsProps) {
  const id = useId();
  const anchor = `--structure-${id.replace(/\W/g, "")}`;
  const [prompt, setPrompt] = useState<"footnote" | "comment" | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      hasSelection: !e.state.selection.empty,
      inColumns: e.isActive("columns"),
    }),
  });
  const close = () => document.getElementById(id)?.hidePopover();
  const item = (label: string, action: () => void, disabled = false) => (
    <button
      type="button"
      role="menuitem"
      className="menu__item"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        close();
        action();
      }}
    >
      {label}
    </button>
  );
  const chain = () => editor.chain().focus();

  return (
    <>
      <button
        type="button"
        className="tool-button tool-button--text"
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
        onMouseDown={(event) => event.preventDefault()}
      >
        <ListTree aria-hidden size={16} />
        Insertar ▾
      </button>
      <div
        id={id}
        popover="auto"
        role="menu"
        className="filter-panel menu"
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {item("Índice de títulos", () => chain().insertTableOfContents().run())}
        {item("Nota al pie…", () => setPrompt("footnote"))}
        {item("Texto en 2 columnas", () => chain().setColumns(2).run())}
        {item("Texto en 3 columnas", () => chain().setColumns(3).run())}
        {item(
          "Quitar columnas",
          () => chain().unsetColumns().run(),
          !state.inColumns,
        )}
      </div>
      <button
        type="button"
        className="tool-button tool-button--text"
        title="Comentario sobre el texto seleccionado"
        disabled={!state.hasSelection}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setPrompt("comment")}
      >
        <MessageSquarePlus aria-hidden size={16} />
        Comentario
      </button>

      {prompt === "footnote" && (
        <TextPromptDialog
          title="Nota al pie"
          label="Texto de la nota"
          confirmLabel="Insertar"
          maxLength={2000}
          onConfirm={(text) => chain().insertFootnote(text).run()}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === "comment" && (
        <TextPromptDialog
          title="Comentario"
          label="Solo lo verás tú; no sale en el PDF ni al exportar."
          confirmLabel="Comentar"
          maxLength={5000}
          onConfirm={async (body) => {
            const comment = await window.artGallery.addDocumentComment(
              documentId,
              body,
            );
            chain().setComment(comment.id).run();
            onCommentAdded();
          }}
          onClose={() => setPrompt(null)}
        />
      )}
    </>
  );
}
