import { useEffect, useState } from "react";
import { ReadOnlyText } from "./ReadOnlyText";

type WordState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; html: string };

/**
 * The text and images of an uploaded Word file. Layout, fonts and text boxes
 * are left out; the original file is untouched. Mount it again (key) for
 * another document.
 */
export function WordPreview({
  documentId,
  className,
}: {
  documentId: string;
  className: string;
}) {
  const [state, setState] = useState<WordState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.previewDocx(documentId).then(
      (html) => isCurrent && setState({ status: "ready", html }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [documentId]);

  if (state.status === "loading") {
    return (
      <p className="documents__status" role="status">
        Preparando la vista…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="documents__status" role="alert">
        No se pudo leer este documento de Word.
      </p>
    );
  }
  return (
    <ReadOnlyText content={state.html} className={className} inlineImages />
  );
}
