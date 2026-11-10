import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import type { TextContent, TextMark } from "../../shared/editorSchema";
import { pageSetupSchema } from "../../shared/pageSetup";
import { createTestImage, useTempDir } from "../testing/fixtures";
import { docxToHtml } from "./docxImport";
import { toDocx } from "./docxExport";

const text = (value: string, marks?: TextMark[]): TextContent => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const paragraph = (...content: TextContent[]): TextContent => ({
  type: "paragraph",
  content,
});

const content: TextContent = {
  type: "doc",
  content: [
    { type: "tableOfContents" },
    { type: "heading", attrs: { level: 1 }, content: [text("Mar adentro")] },
    paragraph(
      text("Pinturas al "),
      text("óleo", [{ type: "bold" }, { type: "italic" }]),
      text(" del "),
      text("puerto", [
        { type: "link", attrs: { href: "https://museo.example" } },
      ]),
      { type: "footnote", attrs: { text: "Préstamo del Museo del Mar." } },
    ),
    {
      type: "bulletList",
      content: [{ type: "listItem", content: [paragraph(text("Sala 1"))] }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [paragraph(text("Obra"))] },
            { type: "tableHeader", content: [paragraph(text("Año"))] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph(text("Marina"))] },
            { type: "tableCell", content: [paragraph(text("1998"))] },
          ],
        },
      ],
    },
    { type: "pageBreak" },
    {
      type: "image",
      attrs: {
        src: "document-asset:3f2b8a4c-1d2e-4f5a-9b8c-7d6e5f4a3b2c.png",
        width: 200,
      },
    },
  ],
};

describe("Word documents", () => {
  it("exports what Word needs to show the document", async () => {
    const dir = await useTempDir();
    const image = await createTestImage(join(dir, "plano.png"), {
      width: 400,
      height: 200,
    });

    const buffer = await toDocx(
      content,
      pageSetupSchema.parse({ header: "Galería Ruiz" }),
      async () => image,
    );
    const { value: html } = await mammoth.convertToHtml({ buffer });

    expect(html).toMatch(/<h1>(<a id="[^"]+"><\/a>)?Mar adentro<\/h1>/);
    expect(html).toMatch(
      /<strong><em>óleo<\/em><\/strong>|<em><strong>óleo<\/strong><\/em>/,
    );
    expect(html).toContain('<a href="https://museo.example">puerto</a>');
    expect(html).toContain("<li>Sala 1</li>");
    expect(html).toMatch(/<td><p>Marina<\/p><\/td>/);
    expect(html).toContain("Préstamo del Museo del Mar.");
    expect(html).toContain("<img");
  });

  it("imports a Word file with its images stored for the document", async () => {
    const dir = await useTempDir();
    const image = await createTestImage(join(dir, "plano.png"));
    const file = join(dir, "contrato.docx");
    await writeFile(
      file,
      await toDocx(content, pageSetupSchema.parse({}), async () => image),
    );
    const stored: string[] = [];

    const html = await docxToHtml(file, async (buffer, contentType) => {
      stored.push(contentType);
      return "artgallery-media://documents/stored.png";
    });

    expect(html).toMatch(/<h1>(<a id="[^"]+"><\/a>)?Mar adentro<\/h1>/);
    expect(html).toContain('src="artgallery-media://documents/stored.png"');
    // Word's notes and index come back as the editor's own.
    expect(html).toContain(
      '<sup data-footnote="" data-text="Préstamo del Museo del Mar."></sup>',
    );
    expect(html).not.toContain("footnote-ref");
    expect(html).toContain('<nav data-table-of-contents=""></nav>');
    expect(html).not.toContain("#_Toc");
    expect(stored).toEqual(["image/png"]);
  });

  it("leaves out images it cannot keep", async () => {
    const dir = await useTempDir();
    const image = await createTestImage(join(dir, "plano.png"));
    const file = join(dir, "contrato.docx");
    await writeFile(
      file,
      await toDocx(content, pageSetupSchema.parse({}), async () => image),
    );

    const html = await docxToHtml(file, async () => null);

    expect(html).not.toContain("<img");
  });
});
