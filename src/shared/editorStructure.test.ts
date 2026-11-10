import { describe, expect, it } from "vitest";
import { commentIdsIn, textContentSchema } from "./editorSchema";

const COMMENT_ID = "0b6c3a2e-8f41-4d7a-9e2b-5c1d0f3a7b64";

const structured = {
  type: "doc",
  content: [
    { type: "tableOfContents" },
    {
      type: "columns",
      attrs: { count: 2 },
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Sala 1",
              marks: [{ type: "comment", attrs: { id: COMMENT_ID } }],
            },
            {
              type: "footnote",
              attrs: { text: "Préstamo del Museo del Mar." },
            },
          ],
        },
      ],
    },
  ],
};

describe("document structure", () => {
  it("accepts a table of contents, columns, footnotes and comments", () => {
    expect(textContentSchema.parse(structured)).toEqual(structured);
  });

  it("only allows two or three columns", () => {
    const columns = (count: number) => ({
      type: "doc",
      content: [
        { type: "columns", attrs: { count }, content: [{ type: "paragraph" }] },
      ],
    });

    expect(() => textContentSchema.parse(columns(3))).not.toThrow();
    expect(() => textContentSchema.parse(columns(4))).toThrow();
  });

  it("finds the comments a document still marks", () => {
    expect(commentIdsIn(structured)).toEqual(new Set([COMMENT_ID]));
    expect(commentIdsIn({ type: "doc", content: [] })).toEqual(new Set());
  });
});
