import { z } from "zod";

export const PAGE_SIZES = ["A4", "Letter"] as const;
export const ORIENTATIONS = ["portrait", "landscape"] as const;
export const MARGIN_PRESETS = ["normal", "narrow", "wide"] as const;

/** Word's Normal, Narrow and Wide margins, in millimetres. */
export const MARGINS_MM: Record<(typeof MARGIN_PRESETS)[number], number> = {
  normal: 25,
  narrow: 12.7,
  wide: 38,
};

const SHEETS_MM: Record<(typeof PAGE_SIZES)[number], [number, number]> = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
};

export const pageSetupSchema = z.object({
  size: z.enum(PAGE_SIZES).default("A4"),
  orientation: z.enum(ORIENTATIONS).default("portrait"),
  margins: z.enum(MARGIN_PRESETS).default("normal"),
  /** Printed at the top of every page; empty prints nothing. */
  header: z.string().trim().max(200).default(""),
  pageNumbers: z.boolean().default(true),
});

export type PageSetup = z.output<typeof pageSetupSchema>;
export type PageSetupInput = z.input<typeof pageSetupSchema>;

export const DEFAULT_PAGE_SETUP: PageSetup = pageSetupSchema.parse({});

export function pageSize({ size, orientation }: PageSetup) {
  const [short, long] = SHEETS_MM[size];
  return orientation === "portrait"
    ? { width: short, height: long }
    : { width: long, height: short };
}

/** The CSS page rule for printing and saving as PDF. */
export function pageCss(setup: PageSetup): string {
  const size = setup.size === "A4" ? "A4" : "letter";
  return `@page { size: ${size} ${setup.orientation}; margin: ${MARGINS_MM[setup.margins]}mm; }`;
}
