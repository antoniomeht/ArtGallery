/** Formats that can be uploaded to Documentación; anything else is refused. */
export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "tif",
  "tiff",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "txt",
  "csv",
  "rtf",
] as const;

export type DocumentExtension = (typeof DOCUMENT_EXTENSIONS)[number];

export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

/** Images the app can show itself; TIFF opens with the system viewer. */
const VIEWABLE_IMAGES: readonly string[] = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
];

const isDocumentExtension = (value: string): value is DocumentExtension =>
  (DOCUMENT_EXTENSIONS as readonly string[]).includes(value);

/** The allowed extension of a path, in lower case, or null. */
export function documentExtension(path: string): DocumentExtension | null {
  const name = path.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  const extension = name.slice(dot + 1).toLowerCase();
  return isDocumentExtension(extension) ? extension : null;
}

export function isViewableImage(extension: string | null): boolean {
  return extension !== null && VIEWABLE_IMAGES.includes(extension);
}

/** Short label for lists: the extension, or TEXTO for documents written here. */
export function documentBadge(extension: string | null): string {
  return extension ? extension.toUpperCase() : "TEXTO";
}

const FORMAT_NAMES: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  odt: "OpenDocument",
  ods: "OpenDocument",
  odp: "OpenDocument",
  txt: "Texto",
  csv: "CSV",
  rtf: "RTF",
};

/** Readable format name, e.g. "Word" or "Imagen". */
export function formatName(extension: string | null): string {
  if (!extension) return "Documento de texto";
  return FORMAT_NAMES[extension] ?? "Imagen";
}

const FORBIDDEN_IN_NAMES = '<>:"|?*';

/**
 * Name for a copy opened or saved outside the app. It always ends with the
 * stored format, from the allowed list, whatever the original name says, so
 * a document can never become a program; folders and characters the system
 * rejects are dropped.
 */
export function externalFileName(
  originalName: string,
  extension: DocumentExtension | string,
): string {
  const name = originalName.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const stem = [...(dot > 0 ? name.slice(0, dot) : name)]
    .filter((char) => char >= " " && !FORBIDDEN_IN_NAMES.includes(char))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return `${stem || "documento"}.${extension}`;
}
