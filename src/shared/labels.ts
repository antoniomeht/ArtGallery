import { z } from "zod";
import type { Artwork } from "./artwork";
import { formatMedium, formatPrice, formatYear } from "./artworkFormat";
import { formatDimensions, type DimensionUnit } from "./dimensions";

/** Information a label can show; the user picks which and in what order. */
export const LABEL_FIELDS = [
  "artist",
  "title",
  "year",
  "medium",
  "dimensions",
  "price",
] as const;
export type LabelField = (typeof LABEL_FIELDS)[number];

export const LABEL_PRESETS = [
  { id: "small", name: "Pequeña", widthMm: 90, heightMm: 50 },
  { id: "medium", name: "Mediana", widthMm: 120, heightMm: 70 },
  { id: "large", name: "Grande", widthMm: 150, heightMm: 100 },
] as const;

/** A4 portrait, with margins that ordinary printers can reach. */
export const SHEET = { widthMm: 210, heightMm: 297, marginMm: 10, gapMm: 4 };

export const LABEL_FONTS = ["sans", "serif"] as const;
export const LABEL_TEXT_SIZES = ["small", "normal", "large"] as const;
export type LabelFont = (typeof LABEL_FONTS)[number];
export type LabelTextSize = (typeof LABEL_TEXT_SIZES)[number];

/** How much each text size scales the label's text. */
export const TEXT_SIZE_SCALE: Record<
  (typeof LABEL_TEXT_SIZES)[number],
  number
> = { small: 0.85, normal: 1, large: 1.2 };

export const labelOptionsSchema = z.object({
  /** In printing order, each at most once. */
  fields: z
    .array(z.enum(LABEL_FIELDS))
    .min(1)
    .refine((fields) => new Set(fields).size === fields.length, {
      message: "A datum appears twice",
    }),
  /** The primary image beside the text. */
  showImage: z.boolean().default(false),
  font: z.enum(LABEL_FONTS).default("sans"),
  textSize: z.enum(LABEL_TEXT_SIZES).default("normal"),
  widthMm: z
    .number()
    .min(40)
    .max(SHEET.widthMm - 2 * SHEET.marginMm),
  heightMm: z
    .number()
    .min(25)
    .max(SHEET.heightMm - 2 * SHEET.marginMm),
});

export type LabelOptions = z.output<typeof labelOptionsSchema>;

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
  fields: ["artist", "title", "year", "medium", "dimensions"],
  showImage: false,
  font: "sans",
  textSize: "normal",
  widthMm: LABEL_PRESETS[0].widthMm,
  heightMm: LABEL_PRESETS[0].heightMm,
};

export interface LabelLayout {
  columns: number;
  rows: number;
  perSheet: number;
}

/** How many labels of this size fit on one sheet, in a regular grid. */
export function labelLayout({
  widthMm,
  heightMm,
}: Pick<LabelOptions, "widthMm" | "heightMm">): LabelLayout {
  const fit = (available: number, size: number) =>
    Math.max(0, Math.floor((available + SHEET.gapMm) / (size + SHEET.gapMm)));
  const columns = fit(SHEET.widthMm - 2 * SHEET.marginMm, widthMm);
  const rows = fit(SHEET.heightMm - 2 * SHEET.marginMm, heightMm);
  return { columns, rows, perSheet: columns * rows };
}

/** Splits items into consecutive sheets of `perSheet` items. */
export function paginate<T>(items: readonly T[], perSheet: number): T[][] {
  const sheets: T[][] = [];
  for (let start = 0; start < items.length; start += perSheet) {
    sheets.push(items.slice(start, start + perSheet));
  }
  return sheets;
}

export interface LabelLine {
  field: LabelField;
  text: string;
  /** On the title line, the year that follows it. */
  year?: string;
}

type LabelArtwork = Pick<
  Artwork,
  | "title"
  | "artist"
  | "year"
  | "yearApproximate"
  | "technique"
  | "support"
  | "dimensions"
  | "price"
  | "currency"
>;

/**
 * The label's lines in the chosen order. A year right after the title
 * joins its line, as in "Marina, 1998"; data the artwork lacks are left out.
 */
export function labelLines(
  artwork: LabelArtwork,
  fields: readonly LabelField[],
  unit: DimensionUnit,
): LabelLine[] {
  const text: Record<LabelField, string | null> = {
    artist: artwork.artist,
    title: artwork.title,
    year: formatYear(artwork),
    medium: formatMedium(artwork),
    dimensions: formatDimensions(artwork.dimensions, unit),
    price: formatPrice(artwork),
  };
  const lines: LabelLine[] = [];
  fields.forEach((field, index) => {
    const value = text[field];
    if (field === "year" && fields[index - 1] === "title") return;
    if (!value) return;
    const year = fields[index + 1] === "year" ? text.year : null;
    lines.push(
      field === "title" && year
        ? { field, text: value, year }
        : { field, text: value },
    );
  });
  return lines;
}
