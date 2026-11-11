import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "../editor/extensions";
import "../editor/editor.css";

/**
 * Text as the editor shows it, read only. HTML passes through the editor's
 * schema, so only what the editor knows is kept.
 */
export function ReadOnlyText({
  content,
  className,
  inlineImages = false,
}: {
  content: JSONContent | string | null;
  className: string;
  /** Keeps pictures carried inside the HTML (a previewed Word file). */
  inlineImages?: boolean;
}) {
  const editor = useEditor({
    extensions: createEditorExtensions({ inlineImages }),
    content: content ?? undefined,
    editable: false,
    editorProps: {
      attributes: { class: `document-page__content ${className}`, lang: "es" },
    },
  });
  return <EditorContent editor={editor} />;
}
