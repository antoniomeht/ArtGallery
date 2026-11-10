import { z } from "zod";
import { optionalText } from "./fields";

/** An uploaded file, or a text document written in the app. */
export type DocumentKind = "file" | "text";

export type DocumentLinkType = "artwork" | "exhibition" | "collection";

/** What a document is linked to, named for showing. */
export interface DocumentLink {
  type: DocumentLinkType;
  id: string;
  label: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  kind: DocumentKind;
  /** Lower case extension of an uploaded file; null for text documents. */
  extension: string | null;
  bytes: number | null;
  links: DocumentLink[];
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  notes: string | null;
  /** Name of the file when it was uploaded. */
  originalName: string | null;
  /** Name inside the document store, e.g. `<id>.pdf`. */
  fileName: string | null;
  createdAt: string;
}

export const DOCUMENT_SORTS = ["recent", "title"] as const;

export const documentQuerySchema = z.object({
  /** Searched in titles and notes. */
  text: z.string().trim().max(300).optional(),
  kind: z.enum(["file", "text"]).optional(),
  sort: z.enum(DOCUMENT_SORTS).default("recent"),
});

export type DocumentQuery = z.input<typeof documentQuerySchema>;

export const documentFieldsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  notes: optionalText(5000),
});

export type DocumentFieldsInput = z.input<typeof documentFieldsSchema>;

export type UploadFailureReason = "unsupported" | "too-large" | "unreadable";

export interface UploadResult {
  added: DocumentDetail[];
  failed: { name: string; reason: UploadFailureReason }[];
}
