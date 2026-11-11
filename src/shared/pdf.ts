/**
 * How far the built-in PDF viewer is with a document. "unknown" means the
 * app could not tell, so it should stop waiting rather than spin forever.
 */
export type PdfLoadState = "loading" | "loaded" | "failed" | "unknown";
