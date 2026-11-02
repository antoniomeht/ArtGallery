import { z } from "zod";

/** Information a label can show, in printing order. */
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

export const labelOptionsSchema = z.object({
  fields: z.array(z.enum(LABEL_FIELDS)).min(1),
  widthMm: z
    .number()
    .min(40)
    .max(SHEET.widthMm - 2 * SHEET.marginMm),
  heightMm: z
    .number()
    .min(25)
    .max(SHEET.heightMm - 2 * SHEET.marginMm),
});

export type LabelOptions = z.infer<typeof labelOptionsSchema>;

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
  fields: ["artist", "title", "year", "medium", "dimensions"],
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
