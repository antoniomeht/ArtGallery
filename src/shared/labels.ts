import { z } from "zod";
import type { Artwork } from "./artwork";
import { formatMedium, formatPrice, formatYear } from "./artworkFormat";
import { formatDimensions, type DimensionUnit } from "./dimensions";

/** Data a label can show, each in its own box. */
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
export type LabelFont = (typeof LABEL_FONTS)[number];

/** Boxes a label can hold: the artwork's primary image and its data. */
export const LABEL_ELEMENT_KINDS = ["image", ...LABEL_FIELDS] as const;
export type LabelElementKind = (typeof LABEL_ELEMENT_KINDS)[number];

/** Millimetres in a typographic point. */
export const MM_PER_PT = 25.4 / 72;
/** Line height of label text, relative to its font size. */
export const LINE_HEIGHT = 1.25;

const position = z.number().min(0).max(1000);

export const labelElementSchema = z.object({
  kind: z.enum(LABEL_ELEMENT_KINDS),
  /** Top left corner, from the label's top left corner. */
  xMm: position,
  yMm: position,
  widthMm: z.number().min(2).max(1000),
  /** The image's box; texts take the height of their lines. */
  heightMm: z.number().min(2).max(1000).nullable(),
  fontSizePt: z.number().min(4).max(96),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
});

export type LabelElement = z.output<typeof labelElementSchema>;

export const labelTemplateSchema = z.object({
  widthMm: z
    .number()
    .min(40)
    .max(SHEET.widthMm - 2 * SHEET.marginMm),
  heightMm: z
    .number()
    .min(25)
    .max(SHEET.heightMm - 2 * SHEET.marginMm),
  font: z.enum(LABEL_FONTS).default("sans"),
  /** Inner margin shown as a guide while editing. */
  marginMm: z.number().min(0).max(30).default(5),
  elements: z
    .array(labelElementSchema)
    .min(1)
    .max(LABEL_ELEMENT_KINDS.length)
    .refine(
      (elements) =>
        new Set(elements.map(({ kind }) => kind)).size === elements.length,
      { message: "A box appears twice" },
    ),
});

export type LabelTemplate = z.output<typeof labelTemplateSchema>;
export type LabelSize = Pick<LabelTemplate, "widthMm" | "heightMm">;

export const DEFAULT_LABEL_KINDS: readonly LabelElementKind[] = [
  "artist",
  "title",
  "year",
  "medium",
  "dimensions",
];

const DEFAULT_MARGIN_MM = 5;
/** Space between stacked lines and between the image and the text. */
const LINE_GAP_MM = 0.8;
const IMAGE_GAP_MM = 4;
/** Share of the inner width the image takes. */
const IMAGE_SHARE = 0.4;

const round1 = (mm: number) => Math.round(mm * 10) / 10;
const roundHalf = (pt: number) => Math.round(pt * 2) / 2;

/** Text grows with the label, from the small preset's height. */
const typeScale = ({ heightMm }: LabelSize) =>
  Math.min(2, Math.max(0.8, heightMm / 50));

function baseStyle(
  kind: LabelElementKind,
  size: LabelSize,
): Pick<LabelElement, "fontSizePt" | "bold" | "italic"> {
  const pt = kind === "artist" ? 10 : kind === "title" ? 11 : 8;
  return {
    fontSizePt: roundHalf(pt * typeScale(size)),
    bold: kind === "artist",
    italic: kind === "title",
  };
}

/** Height a text box takes with one line. */
export const textHeightMm = (fontSizePt: number) =>
  fontSizePt * MM_PER_PT * LINE_HEIGHT;

/** Height of a box, counting texts as one line. */
export const elementHeightMm = (element: LabelElement) =>
  element.heightMm ?? textHeightMm(element.fontSizePt);

function imageElement(size: LabelSize, xMm: number): LabelElement {
  return {
    kind: "image",
    xMm,
    yMm: DEFAULT_MARGIN_MM,
    widthMm: round1((size.widthMm - 2 * DEFAULT_MARGIN_MM) * IMAGE_SHARE),
    heightMm: round1(size.heightMm - 2 * DEFAULT_MARGIN_MM),
    fontSizePt: 8,
    bold: false,
    italic: false,
  };
}

/**
 * The usual label: texts stacked and centred vertically inside the margins,
 * with the image, if any, on their left.
 */
export function defaultLabelTemplate(
  size: LabelSize,
  kinds: readonly LabelElementKind[] = DEFAULT_LABEL_KINDS,
): LabelTemplate {
  const margin = DEFAULT_MARGIN_MM;
  const image = kinds.includes("image") ? imageElement(size, margin) : null;
  const textX = image ? round1(margin + image.widthMm + IMAGE_GAP_MM) : margin;
  const texts = kinds
    .filter((kind) => kind !== "image")
    .map((kind) => ({ kind, ...baseStyle(kind, size) }));
  const heights = texts.map(({ fontSizePt }) => textHeightMm(fontSizePt));
  const total =
    heights.reduce((sum, height) => sum + height, 0) +
    LINE_GAP_MM * Math.max(0, texts.length - 1);
  let y = Math.max(margin, (size.heightMm - total) / 2);
  const elements: LabelElement[] = texts.map((text, index) => {
    const element = {
      ...text,
      xMm: textX,
      yMm: round1(y),
      widthMm: round1(size.widthMm - margin - textX),
      heightMm: null,
    };
    y += (heights[index] ?? 0) + LINE_GAP_MM;
    return element;
  });
  return {
    ...size,
    font: "sans",
    marginMm: margin,
    elements: image ? [image, ...elements] : elements,
  };
}

/**
 * Adds a box in a free place: a datum goes below the lowest text, or at the
 * top margin when it would not fit; the image goes on the right.
 */
export function addElement(
  template: LabelTemplate,
  kind: LabelElementKind,
): LabelTemplate {
  if (template.elements.some((element) => element.kind === kind)) {
    return template;
  }
  const { marginMm } = template;
  if (kind === "image") {
    const image = imageElement(template, 0);
    image.xMm = round1(
      Math.max(0, template.widthMm - marginMm - image.widthMm),
    );
    return { ...template, elements: [...template.elements, image] };
  }
  const texts = template.elements.filter(({ heightMm }) => heightMm === null);
  const style = baseStyle(kind, template);
  const xMm = texts[0]?.xMm ?? marginMm;
  const below =
    texts.length > 0
      ? Math.max(...texts.map((text) => text.yMm + elementHeightMm(text))) +
        LINE_GAP_MM
      : marginMm;
  const fits =
    below + textHeightMm(style.fontSizePt) <= template.heightMm - marginMm;
  const element: LabelElement = {
    kind,
    ...style,
    xMm,
    yMm: round1(fits ? below : marginMm),
    widthMm: round1(texts[0]?.widthMm ?? template.widthMm - xMm - marginMm),
    heightMm: null,
  };
  return { ...template, elements: [...template.elements, element] };
}

export function removeElements(
  template: LabelTemplate,
  kinds: readonly LabelElementKind[],
): LabelTemplate {
  return {
    ...template,
    elements: template.elements.filter(({ kind }) => !kinds.includes(kind)),
  };
}

/** A new label size, with every box scaled in proportion. */
export function resizeTemplate(
  template: LabelTemplate,
  size: LabelSize,
): LabelTemplate {
  const fx = size.widthMm / template.widthMm;
  const fy = size.heightMm / template.heightMm;
  return {
    ...template,
    ...size,
    elements: template.elements.map((element) => ({
      ...element,
      xMm: round1(element.xMm * fx),
      yMm: round1(element.yMm * fy),
      widthMm: round1(element.widthMm * fx),
      heightMm:
        element.heightMm === null ? null : round1(element.heightMm * fy),
      fontSizePt: roundHalf(element.fontSizePt * Math.min(fx, fy)),
    })),
  };
}

export interface LabelLayout {
  columns: number;
  rows: number;
  perSheet: number;
}

/** How many labels of this size fit on one sheet, in a regular grid. */
export function labelLayout({ widthMm, heightMm }: LabelSize): LabelLayout {
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

/** What each datum reads on the label; null when the artwork lacks it. */
export function labelTexts(
  artwork: LabelArtwork,
  unit: DimensionUnit,
): Record<LabelField, string | null> {
  return {
    artist: artwork.artist,
    title: artwork.title,
    year: formatYear(artwork),
    medium: formatMedium(artwork),
    dimensions: formatDimensions(artwork.dimensions, unit),
    price: formatPrice(artwork),
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const updateElements = (
  template: LabelTemplate,
  kinds: readonly LabelElementKind[],
  update: (element: LabelElement) => LabelElement,
): LabelTemplate => ({
  ...template,
  elements: template.elements.map((element) =>
    kinds.includes(element.kind) ? update(element) : element,
  ),
});

/** Shifts the chosen boxes, keeping each one inside the label. */
export function moveElements(
  template: LabelTemplate,
  kinds: readonly LabelElementKind[],
  dxMm: number,
  dyMm: number,
): LabelTemplate {
  return updateElements(template, kinds, (element) => ({
    ...element,
    xMm: round1(
      clamp(element.xMm + dxMm, 0, template.widthMm - element.widthMm),
    ),
    yMm: round1(
      clamp(
        element.yMm + dyMm,
        0,
        template.heightMm - elementHeightMm(element),
      ),
    ),
  }));
}

/** New width, and height for the image, up to the label's edge. */
export function resizeElement(
  template: LabelTemplate,
  kind: LabelElementKind,
  widthMm: number,
  heightMm: number,
): LabelTemplate {
  return updateElements(template, [kind], (element) => ({
    ...element,
    widthMm: round1(clamp(widthMm, 2, template.widthMm - element.xMm)),
    heightMm:
      element.heightMm === null
        ? null
        : round1(clamp(heightMm, 2, template.heightMm - element.yMm)),
  }));
}

export function styleElements(
  template: LabelTemplate,
  kinds: readonly LabelElementKind[],
  style: Partial<Pick<LabelElement, "fontSizePt" | "bold" | "italic">>,
): LabelTemplate {
  return updateElements(template, kinds, (element) => ({
    ...element,
    ...style,
  }));
}
