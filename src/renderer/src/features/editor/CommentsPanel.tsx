import type { Editor } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentComment } from "../../../../shared/document";
import { IconButton } from "../../components/IconButton";
import { formatDate } from "../documents/documentText";
import { commentRange } from "./structure";

interface CommentsPanelProps {
  documentId: string;
  editor: Editor;
  /** Changes after each save or new comment, so the list is current. */
  version: number;
}

/** Comments on the text; clicking one selects the text it is about. */
export function CommentsPanel({
  documentId,
  editor,
  version,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [removed, setRemoved] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listDocumentComments(documentId)
      .then((list) => isCurrent && setComments(list));
    return () => {
      isCurrent = false;
    };
  }, [documentId, version, removed]);

  if (comments.length === 0) return null;

  return (
    <section className="document-comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="document-links__title">
        Comentarios
      </h2>
      {comments.map((comment) => (
        <article key={comment.id} className="document-comment">
          <button
            type="button"
            className="document-comment__body"
            onClick={() => {
              const range = commentRange(editor, comment.id);
              if (range) {
                editor
                  .chain()
                  .focus()
                  .setTextSelection(range)
                  .scrollIntoView()
                  .run();
              }
            }}
          >
            {comment.body}
          </button>
          <div className="document-comment__footer">
            <span>{formatDate(comment.createdAt)}</span>
            <IconButton
              aria-label="Eliminar comentario"
              onClick={async () => {
                editor.chain().removeComment(comment.id).run();
                await window.artGallery.deleteDocumentComment(comment.id);
                setRemoved((current) => current + 1);
              }}
            >
              <Trash2 aria-hidden size={14} />
            </IconButton>
          </div>
        </article>
      ))}
    </section>
  );
}
