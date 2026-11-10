import type {
  UploadFailureReason,
  UploadResult,
} from "../../../../shared/document";

const REASONS: Record<UploadFailureReason, string> = {
  unsupported: "formato no admitido",
  "too-large": "supera 100 MB",
  unreadable: "no se puede leer",
};

const numberFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${numberFormat.format(bytes / (1024 * 1024))} MB`;
}

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export interface UploadSummary {
  tone: "success" | "error";
  message: string;
}

/** What to tell after uploading: what was added and why anything was not. */
export function uploadSummary({ added, failed }: UploadResult): UploadSummary {
  const addedText =
    added.length === 1
      ? `Documento añadido: ${added[0]?.originalName ?? added[0]?.title}`
      : `${added.length} documentos añadidos`;
  if (failed.length === 0) return { tone: "success", message: addedText };

  const [only] = failed;
  const refused =
    failed.length === 1 && added.length === 0 && only
      ? `No se pudo añadir ${only.name}: ${REASONS[only.reason]}`
      : `No se pudo añadir ${joinWithNi(
          failed.map(({ name, reason }) => `${name} (${REASONS[reason]})`),
        )}`;
  if (added.length === 0) return { tone: "error", message: refused };
  const addedCount =
    added.length === 1
      ? "1 documento añadido"
      : `${added.length} documentos añadidos`;
  return { tone: "error", message: `${addedCount}. ${refused}` };
}

/** "a", "a ni b", "a, b ni c": Spanish lists after a negative verb. */
function joinWithNi(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} ni ${items.at(-1)}`;
}
