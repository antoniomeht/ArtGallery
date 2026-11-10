import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import sharp from "sharp";
import type { TextContent, TextMark } from "../../shared/editorSchema";
import { MARGINS_MM, pageSize, type PageSetup } from "../../shared/pageSetup";

/** Where an image of the document is on disk, or null if it is gone. */
export type ResolveImage = (src: string) => Promise<string | null>;

const twips = (mm: number) => Math.round((mm * 1440) / 25.4);
/** Word measures images in pixels at 96 dpi, like the editor. */
const MAX_IMAGE_WIDTH_PX = 600;
const INDENT_TWIPS = 720;
const ORDERED = "ordered";

const ALIGNMENTS = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

const HEADINGS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

/** Bundled fonts may be missing where the file is opened; use close ones. */
const WORD_FONTS: Record<string, string> = {
  "Instrument Sans": "Arial",
  "Instrument Serif": "Georgia",
};

interface Context {
  resolveImage: ResolveImage;
  footnotes: Record<number, { children: Paragraph[] }>;
}

const attr = (node: { attrs?: Record<string, unknown> }, key: string) =>
  node.attrs?.[key];

function runOptions(marks: TextMark[] = []): IRunOptions {
  const options: Record<string, unknown> = {};
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        options.bold = true;
        break;
      case "italic":
        options.italics = true;
        break;
      case "underline":
        options.underline = {};
        break;
      case "strike":
        options.strike = true;
        break;
      case "superscript":
        options.superScript = true;
        break;
      case "subscript":
        options.subScript = true;
        break;
      case "highlight": {
        const color = String(mark.attrs?.color ?? "#fff1a8").slice(1);
        options.shading = {
          type: ShadingType.CLEAR,
          fill: color,
          color: "auto",
        };
        break;
      }
      case "textStyle": {
        const { fontFamily, fontSize, color } = mark.attrs ?? {};
        if (typeof fontFamily === "string") {
          options.font = WORD_FONTS[fontFamily] ?? fontFamily;
        }
        if (typeof fontSize === "string") {
          options.size = Number.parseInt(fontSize, 10) * 2;
        }
        if (typeof color === "string") options.color = color.slice(1);
        break;
      }
    }
  }
  return options as IRunOptions;
}

/** Text, links, line breaks and footnote numbers inside a paragraph. */
function inlineRuns(
  nodes: TextContent[] = [],
  context: Context,
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ text: "", break: 1 }));
    } else if (node.type === "footnote") {
      const id = Object.keys(context.footnotes).length + 1;
      context.footnotes[id] = {
        children: [new Paragraph(String(attr(node, "text") ?? ""))],
      };
      runs.push(new FootnoteReferenceRun(id));
    } else if (node.type === "text") {
      const link = node.marks?.find((mark) => mark.type === "link");
      const run = new TextRun({
        text: node.text ?? "",
        ...runOptions(node.marks),
        ...(link ? { style: "Hyperlink" } : {}),
      });
      runs.push(
        link
          ? new ExternalHyperlink({
              link: String(link.attrs?.href ?? ""),
              children: [run],
            })
          : run,
      );
    }
  }
  return runs;
}

function paragraph(
  node: TextContent,
  context: Context,
  extra: Record<string, unknown> = {},
): Paragraph {
  const align = attr(node, "textAlign") as keyof typeof ALIGNMENTS | null;
  const lineHeight = Number(attr(node, "lineHeight") ?? 0);
  const indent = Number(attr(node, "indent") ?? 0);
  const level = attr(node, "level") as keyof typeof HEADINGS | undefined;
  return new Paragraph({
    children: inlineRuns(node.content, context),
    ...(node.type === "heading" && level ? { heading: HEADINGS[level] } : {}),
    ...(align ? { alignment: ALIGNMENTS[align] } : {}),
    ...(lineHeight ? { spacing: { line: Math.round(240 * lineHeight) } } : {}),
    ...(indent ? { indent: { left: indent * INDENT_TWIPS } } : {}),
    ...extra,
  });
}

async function image(
  node: TextContent,
  context: Context,
): Promise<Paragraph | null> {
  const path = await context.resolveImage(String(attr(node, "src") ?? ""));
  if (!path) return null;
  // Word does not read WebP; PNG keeps every image sharp.
  const { data, info } = await sharp(path).rotate().png().toBuffer({
    resolveWithObject: true,
  });
  const width = Math.min(
    Number(attr(node, "width") ?? info.width),
    MAX_IMAGE_WIDTH_PX,
  );
  const height = Math.round((width * info.height) / info.width);
  const align = attr(node, "align") as keyof typeof ALIGNMENTS | null;
  return new Paragraph({
    ...(align ? { alignment: ALIGNMENTS[align] } : {}),
    children: [
      new ImageRun({ type: "png", data, transformation: { width, height } }),
    ],
  });
}

async function listItems(
  list: TextContent,
  context: Context,
  level: number,
): Promise<FileChild[]> {
  const ordered = list.type === "orderedList";
  const children: FileChild[] = [];
  for (const item of list.content ?? []) {
    for (const block of item.content ?? []) {
      if (block.type === "bulletList" || block.type === "orderedList") {
        children.push(...(await listItems(block, context, level + 1)));
      } else {
        children.push(
          paragraph(
            block,
            context,
            ordered
              ? { numbering: { reference: ORDERED, level } }
              : { bullet: { level } },
          ),
        );
      }
    }
  }
  return children;
}

async function table(node: TextContent, context: Context): Promise<Table> {
  const rows: TableRow[] = [];
  for (const row of node.content ?? []) {
    const cells: TableCell[] = [];
    for (const cell of row.content ?? []) {
      const isHeader = cell.type === "tableHeader";
      cells.push(
        new TableCell({
          children: (await blocks(cell.content ?? [], context)).filter(
            (child): child is Paragraph | Table =>
              child instanceof Paragraph || child instanceof Table,
          ),
          columnSpan: Number(attr(cell, "colspan") ?? 1),
          rowSpan: Number(attr(cell, "rowspan") ?? 1),
          ...(isHeader
            ? {
                shading: {
                  type: ShadingType.CLEAR,
                  fill: "F3F3F0",
                  color: "auto",
                },
              }
            : {}),
        }),
      );
    }
    rows.push(
      new TableRow({
        children: cells,
        // docx writes the flag even when false, and Word reads any as true.
        ...((row.content ?? []).every((cell) => cell.type === "tableHeader")
          ? { tableHeader: true }
          : {}),
      }),
    );
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

async function blocks(
  nodes: TextContent[],
  context: Context,
): Promise<FileChild[]> {
  const children: FileChild[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "paragraph":
      case "heading":
        children.push(paragraph(node, context));
        break;
      case "blockquote":
        for (const child of await blocks(node.content ?? [], context)) {
          children.push(child);
        }
        break;
      case "bulletList":
      case "orderedList":
        children.push(...(await listItems(node, context, 0)));
        break;
      case "table":
        children.push(await table(node, context));
        break;
      case "image": {
        const result = await image(node, context);
        if (result) children.push(result);
        break;
      }
      case "pageBreak":
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      case "horizontalRule":
        children.push(
          new Paragraph({
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "B9B9B3",
                space: 1,
              },
            },
          }),
        );
        break;
      case "tableOfContents":
        children.push(
          new TableOfContents("Índice", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),
        );
        break;
      // Columns keep their text; Word would need a section of their own.
      case "columns":
        children.push(...(await blocks(node.content ?? [], context)));
        break;
    }
  }
  return children;
}

/**
 * A Word file with the document's text, formatting, tables, images, notes
 * and page setup. Comments are internal and are not exported.
 */
export async function toDocx(
  content: TextContent,
  setup: PageSetup,
  resolveImage: ResolveImage,
): Promise<Buffer> {
  const context: Context = { resolveImage, footnotes: {} };
  const children = await blocks(content.content ?? [], context);
  const { width, height } = pageSize({ ...setup, orientation: "portrait" });
  const margin = twips(MARGINS_MM[setup.margins]);
  const small = { size: 16, color: "555555" };

  const document = new Document({
    features: { updateFields: true },
    numbering: {
      config: [
        {
          reference: ORDERED,
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: {
              paragraph: {
                indent: { left: INDENT_TWIPS * (level + 1), hanging: 360 },
              },
            },
          })),
        },
      ],
    },
    footnotes: context.footnotes,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: twips(width),
              height: twips(height),
              orientation:
                setup.orientation === "landscape"
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            margin: {
              top: margin,
              right: margin,
              bottom: margin,
              left: margin,
            },
          },
        },
        headers: setup.header
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: setup.header, ...small })],
                  }),
                ],
              }),
            }
          : undefined,
        footers: setup.pageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: [
                          PageNumber.CURRENT,
                          " / ",
                          PageNumber.TOTAL_PAGES,
                        ],
                        ...small,
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children: children.length > 0 ? children : [new Paragraph("")],
      },
    ],
  });
  return Packer.toBuffer(document);
}
