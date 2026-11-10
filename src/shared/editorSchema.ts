import { z } from "zod";

/** Fonts found on Windows and macOS, or bundled with the app. */
export const EDITOR_FONTS = [
  "Instrument Sans",
  "Instrument Serif",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
] as const;

export const FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72,
] as const;

export const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"] as const;

export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;

export const MAX_INDENT = 8;

export const IMAGE_ALIGNS = ["left", "center", "right"] as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** An artwork image shown in a document, by image id. */
export const ARTWORK_IMAGE_SRC = new RegExp(`^artwork-image:(${UUID})$`);
/** An image copied into the document store for one document. */
export const DOCUMENT_ASSET_SRC = new RegExp(
  `^document-asset:(${UUID}\\.(?:jpg|jpeg|png|webp|gif))$`,
);

/** Links may only open web pages or write an email. */
export const isSafeHref = (href: string) =>
  /^(https?:\/\/|mailto:)/i.test(href);

type Rules = Record<string, z.ZodType>;

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const fontSize = z
  .string()
  .regex(/^\d{1,2}pt$/)
  .refine((value) =>
    (FONT_SIZES as readonly number[]).includes(Number.parseInt(value, 10)),
  );

/** Paragraph-level formatting shared by paragraphs and headings. */
const BLOCK_ATTRS: Rules = {
  textAlign: z.enum(TEXT_ALIGNS).nullable(),
  lineHeight: z.enum(LINE_HEIGHTS).nullable(),
  indent: z.number().int().min(0).max(MAX_INDENT).nullable(),
};

const CELL_ATTRS: Rules = {
  colspan: z.number().int().min(1).max(50),
  rowspan: z.number().int().min(1).max(50),
  colwidth: z.array(z.number().int().min(1).max(4000)).max(50).nullable(),
};

/** Every node the editor can make, with the attributes each may carry. */
export const NODE_RULES: Record<string, Rules> = {
  doc: {},
  text: {},
  paragraph: BLOCK_ATTRS,
  heading: { ...BLOCK_ATTRS, level: z.number().int().min(1).max(3) },
  blockquote: {},
  bulletList: {},
  orderedList: {
    start: z.number().int().min(0).max(100_000),
    type: z.string().max(10).nullable(),
  },
  listItem: {},
  hardBreak: {},
  horizontalRule: {},
  pageBreak: {},
  table: {},
  tableRow: {},
  tableHeader: CELL_ATTRS,
  tableCell: CELL_ATTRS,
  image: {
    src: z
      .string()
      .refine(
        (src) => ARTWORK_IMAGE_SRC.test(src) || DOCUMENT_ASSET_SRC.test(src),
      ),
    alt: z.string().max(300).nullable(),
    title: z.string().max(300).nullable(),
    width: z.number().int().min(16).max(4000).nullable(),
    height: z.number().int().min(16).max(4000).nullable(),
    align: z.enum(IMAGE_ALIGNS).nullable(),
  },
};

export const MARK_RULES: Record<string, Rules> = {
  bold: {},
  italic: {},
  underline: {},
  strike: {},
  subscript: {},
  superscript: {},
  textStyle: {
    fontFamily: z.enum(EDITOR_FONTS).nullable(),
    fontSize: fontSize.nullable(),
    color: color.nullable(),
  },
  highlight: { color: color.nullable() },
  link: { href: z.string().max(2000).refine(isSafeHref) },
};

export interface TextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TextContent {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TextContent[];
  marks?: TextMark[];
  text?: string;
}

/**
 * Keeps only known attributes, each checked against its rule. Unknown types
 * are refused: nothing the editor cannot make reaches the database.
 */
function checked<T extends TextMark>(
  item: T,
  rules: Record<string, Rules>,
  ctx: z.RefinementCtx,
): T {
  const allowed = rules[item.type];
  if (!allowed) {
    ctx.addIssue({ code: "custom", message: `Not allowed: ${item.type}` });
    return z.NEVER;
  }
  if (!item.attrs) return item;
  const attrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item.attrs)) {
    const rule = allowed[key];
    if (!rule) continue;
    const result = rule.safeParse(value);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: `Invalid ${item.type}.${key}` });
      return z.NEVER;
    }
    attrs[key] = result.data;
  }
  return { ...item, attrs };
}

const attrsSchema = z.record(z.string(), z.unknown()).optional();

const markSchema = z
  .object({ type: z.string(), attrs: attrsSchema })
  .transform((mark, ctx) => checked(mark, MARK_RULES, ctx));

const nodeSchema: z.ZodType<TextContent> = z.lazy(() =>
  z
    .object({
      type: z.string(),
      attrs: attrsSchema,
      content: z.array(nodeSchema).max(20_000).optional(),
      marks: z.array(markSchema).max(20).optional(),
      text: z.string().max(200_000).optional(),
    })
    .transform((node, ctx) => checked(node, NODE_RULES, ctx)),
);

export const textContentSchema = nodeSchema.refine(
  (node) => node.type === "doc",
  { message: "The root must be a document" },
);

export const EMPTY_TEXT_CONTENT: TextContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
