import { documentBadge } from "../../../../shared/documentFormats";

const TONES: Record<string, string> = {
  pdf: "red",
  doc: "blue",
  docx: "blue",
  odt: "blue",
  rtf: "blue",
  xls: "green",
  xlsx: "green",
  ods: "green",
  csv: "green",
  ppt: "orange",
  pptx: "orange",
  odp: "orange",
};

/** Format of a document as a small coloured label, e.g. PDF or TEXTO. */
export function DocumentBadge({ extension }: { extension: string | null }) {
  const tone = extension ? (TONES[extension] ?? "purple") : "neutral";
  return (
    <span className={`document-badge document-badge--${tone}`}>
      {documentBadge(extension)}
    </span>
  );
}
