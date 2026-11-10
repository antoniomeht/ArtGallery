import { describe, expect, it } from "vitest";
import { textContentSchema } from "./editorSchema";

const ARTWORK_IMAGE = "artwork-image:3f2b8a4c-1d2e-4f5a-9b8c-7d6e5f4a3b2c";
const DOCUMENT_ASSET =
  "document-asset:9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d.png";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const link = (href: string) =>
  doc({
    type: "paragraph",
    content: [
      { type: "text", text: "web", marks: [{ type: "link", attrs: { href } }] },
    ],
  });
const image = (src: string) =>
  doc({ type: "image", attrs: { src, width: 320, align: "center" } });

describe("inserted content", () => {
  it("accepts tables, images, page breaks and safe links", () => {
    const content = doc(
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: [120] },
                content: [{ type: "paragraph" }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 2, rowspan: 1, colwidth: null },
                content: [{ type: "paragraph" }],
              },
            ],
          },
        ],
      },
      {
        type: "image",
        attrs: { src: ARTWORK_IMAGE, width: 320, align: "center" },
      },
      {
        type: "image",
        attrs: { src: DOCUMENT_ASSET, width: null, align: null },
      },
      { type: "pageBreak" },
    );

    expect(textContentSchema.parse(content)).toEqual(content);
    expect(() =>
      textContentSchema.parse(link("https://museo.example/sala")),
    ).not.toThrow();
    expect(() =>
      textContentSchema.parse(link("mailto:ana@museo.example")),
    ).not.toThrow();
  });

  it("refuses links that could run code or open files", () => {
    expect(() =>
      textContentSchema.parse(link("javascript:alert(1)")),
    ).toThrow();
    expect(() => textContentSchema.parse(link("file:///C:/Windows"))).toThrow();
  });

  it("only shows images kept by the app", () => {
    expect(() =>
      textContentSchema.parse(image("https://example.com/x.png")),
    ).toThrow();
    expect(() =>
      textContentSchema.parse(image("artwork-image:../../x")),
    ).toThrow();
    expect(() =>
      textContentSchema.parse(
        image("document-asset:9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d.exe"),
      ),
    ).toThrow();
  });
});
