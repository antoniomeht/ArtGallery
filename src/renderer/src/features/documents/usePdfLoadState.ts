import { useEffect, useState } from "react";
import type { PdfLoadState } from "../../../../shared/pdf";

const POLL_MS = 500;
/** Longer than the slowest PDF seen; after that the app stops waiting. */
const GIVE_UP_MS = 3 * 60 * 1000;

/**
 * Whether the PDF viewer has drawn `src` yet, asked every half second until
 * it has, has failed or cannot tell. Mount again (key) for another PDF.
 */
export function usePdfLoadState(src: string): PdfLoadState {
  const [state, setState] = useState<PdfLoadState>("loading");

  useEffect(() => {
    let timer: number | undefined;
    let isCurrent = true;
    const startedAt = Date.now();
    const poll = () => {
      window.artGallery.pdfLoadState(src).then(
        (next) => {
          if (!isCurrent) return;
          if (next === "loading" && Date.now() - startedAt < GIVE_UP_MS) {
            timer = window.setTimeout(poll, POLL_MS);
          } else {
            setState(next === "loading" ? "unknown" : next);
          }
        },
        () => isCurrent && setState("unknown"),
      );
    };
    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [src]);

  return state;
}
