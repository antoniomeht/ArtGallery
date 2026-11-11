import type { PdfLoadState } from "../../shared/pdf";

/** What is used of an Electron `WebFrameMain`. */
export interface PdfFrame {
  url: string;
  parent: PdfFrame | null;
  executeJavaScript(code: string): Promise<unknown>;
}

/** Chromium's built-in PDF viewer, which draws PDFs shown in an iframe. */
const VIEWER_ORIGIN = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/";

/**
 * The viewer gives no event when it has drawn a document, but its element
 * keeps a load state. Reading it depends on Chromium internals, so anything
 * unexpected is "unknown" and the app simply stops showing that it waits.
 */
const READ_STATE = `document.querySelector("pdf-viewer")?.loadState_ ?? null`;

const withoutHash = (url: string) => url.split("#")[0];

export async function readPdfLoadState(
  frames: readonly PdfFrame[],
  src: string,
): Promise<PdfLoadState> {
  const viewer = frames.find(
    (frame) =>
      frame.url.startsWith(VIEWER_ORIGIN) &&
      frame.parent !== null &&
      withoutHash(frame.parent.url) === withoutHash(src),
  );
  if (!viewer) return "loading";
  try {
    const state = await viewer.executeJavaScript(READ_STATE);
    if (state === "loading") return "loading";
    if (state === "success") return "loaded";
    if (state === "failed") return "failed";
    return "unknown";
  } catch {
    return "unknown";
  }
}
