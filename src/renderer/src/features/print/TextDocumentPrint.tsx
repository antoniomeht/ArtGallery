import { EditorContent, useEditor } from "@tiptap/react";
import type { DocumentDetail } from "../../../../shared/document";
import { DEFAULT_PAGE_SETUP, pageCss } from "../../../../shared/pageSetup";
import { createEditorExtensions } from "../editor/extensions";
import "../editor/editor.css";

/**
 * A text document as it prints: the same extensions as the editor, read
 * only, so the index, the note numbers and the images match the screen.
 */
export function TextDocumentPrint({ document }: { document: DocumentDetail }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: document.content ?? undefined,
    editable: false,
    editorProps: {
      attributes: { class: "document-page__content", lang: "es" },
    },
  });

  return (
    <div className="print-text-document">
      <style>{pageCss(document.pageSetup ?? DEFAULT_PAGE_SETUP)}</style>
      <EditorContent editor={editor} />
    </div>
  );
}
