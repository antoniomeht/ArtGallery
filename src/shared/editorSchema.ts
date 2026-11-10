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
