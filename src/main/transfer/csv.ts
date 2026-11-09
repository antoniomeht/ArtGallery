import type { Artwork } from "../../shared/artwork";
import { STATUS_LABELS } from "../../shared/artworkFormat";
import {
  AXIS_LABELS,
  DIMENSION_UNITS,
  MEASURE_AXES,
  roundMeasure,
} from "../../shared/dimensions";

/** Lets Excel detect the encoding. */
const UTF8_BOM = String.fromCharCode(0xfeff);

const COLUMNS: [header: string, value: (artwork: Artwork) => unknown][] = [
  ["Id", (a) => a.id],
  ["Título", (a) => a.title],
  ["Artista", (a) => a.artist],
  ["Categoría", (a) => a.category],
  ["Técnica", (a) => a.technique],
  ["Soporte", (a) => a.support],
  ["Año", (a) => a.year],
  ["Año aproximado", (a) => (a.yearApproximate ? "Sí" : "No")],
  ...DIMENSION_UNITS.flatMap((unit) =>
    MEASURE_AXES.map((axis): [string, (artwork: Artwork) => unknown] => [
      `${AXIS_LABELS[axis]} (${unit})`,
      (a) => {
        const value = a.dimensions[unit][axis];
        return value == null ? null : roundMeasure(value);
      },
    ]),
  ),
  ["Estado", (a) => STATUS_LABELS[a.status]],
  ["Precio", (a) => a.price],
  ["Moneda", (a) => a.currency],
  ["Ubicación", (a) => a.location],
  ["Etiquetas", (a) => a.tags.join(", ")],
  ["Descripción", (a) => a.description],
  ["Notas", (a) => a.notes],
  ["Imágenes", (a) => a.images.length],
  ["Fecha de incorporación", (a) => a.createdAt],
];

/**
 * Metadata only, for spreadsheets. Uses ";" and a UTF-8 BOM, which is what
 * Excel expects with Spanish regional settings.
 */
export function toCsv(artworks: readonly Artwork[]): string {
  const rows = [
    COLUMNS.map(([header]) => header),
    ...artworks.map((artwork) =>
      COLUMNS.map(([, value]) => cell(value(artwork))),
    ),
  ];
  return `${UTF8_BOM}${rows.map((row) => row.map(quote).join(";")).join("\r\n")}\r\n`;
}

function cell(value: unknown): string {
  if (value == null) return "";
  // Decimal comma, as a Spanish spreadsheet reads numbers.
  if (typeof value === "number") return String(value).replace(".", ",");
  const text = String(value);
  // Text starting with = + - @ would run as a formula when the file is opened.
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function quote(text: string): string {
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
