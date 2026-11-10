import { z } from "zod";
import type { TextContent } from "./editorSchema";
import { optionalText } from "./fields";

/** An uploaded file, or a text document written in the app. */
export type DocumentKind = "file" | "text";

export const DOCUMENT_LINK_TYPES = [
  "artwork",
  "exhibition",
  "collection",
] as const;

export type DocumentLinkType = (typeof DOCUMENT_LINK_TYPES)[number];

/** Something a document can be linked to. */
export const documentLinkRefSchema = z.object({
  type: z.enum(DOCUMENT_LINK_TYPES),
  id: z.string().min(1),
});

export type DocumentLinkRef = z.infer<typeof documentLinkRefSchema>;

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
  /** What a text document says; null for uploaded files. */
  content: TextContent | null;
  createdAt: string;
}

export const DOCUMENT_SORTS = ["recent", "title"] as const;

export const documentQuerySchema = z.object({
  /** Searched in titles and notes. */
  text: z.string().trim().max(300).optional(),
  kind: z.enum(["file", "text"]).optional(),
  sort: z.enum(DOCUMENT_SORTS).default("recent"),
  linkedTo: documentLinkRefSchema.optional(),
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

/** A note on part of a text document, for the user only. */
export interface DocumentComment {
  id: string;
  body: string;
  createdAt: string;
}

export const commentBodySchema = z.string().trim().min(1).max(5000);
