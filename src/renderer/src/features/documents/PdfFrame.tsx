import { LoaderCircle } from "lucide-react";
import { usePdfLoadState } from "./usePdfLoadState";

/**
 * A PDF in the built-in viewer, with a loading sign over it until it has been
 * drawn: large files stay blank for a while. The rest of the app stays usable.
 */
export function PdfFrame({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className: string;
}) {
  const state = usePdfLoadState(src);
  return (
    <div className="pdf-frame">
      <iframe className={className} src={src} title={title} />
      {state === "loading" && (
        <div className="pdf-frame__loading" role="status">
          <LoaderCircle className="spin" aria-hidden size={28} />
          <p>Cargando PDF…</p>
        </div>
      )}
      {state === "failed" && (
        <div className="pdf-frame__loading" role="alert">
          <p>No se pudo mostrar este PDF.</p>
        </div>
      )}
    </div>
  );
}
