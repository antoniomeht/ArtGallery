import { describe, expect, it } from "vitest";
import { textContentSchema } from "./editorSchema";

const text = (value: string, marks?: unknown[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const formatted = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2, textAlign: "center" },
      content: [text("Mar adentro")],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "justify", lineHeight: "1.5", indent: 1 },
      content: [
        text("Óleo", [
          { type: "bold" },
          { type: "underline" },
          {
            type: "textStyle",
            attrs: {
              fontFamily: "Georgia",
              fontSize: "14pt",
              color: "#c42b1c",
            },
          },
          { type: "highlight", attrs: { color: "#fff1a8" } },
        ]),
        text("2", [{ type: "subscript" }]),
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [text("Sala 1")] }],
        },
      ],
    },
    { type: "horizontalRule" },
  ],
};

describe("text document content", () => {
  it("accepts the formatting the editor offers", () => {
    expect(textContentSchema.parse(formatted)).toEqual(formatted);
  });

  it("rejects nodes and marks the editor does not have", () => {
    expect(() =>
      textContentSchema.parse({ type: "doc", content: [{ type: "script" }] }),
    ).toThrow();
    expect(() =>
      textContentSchema.parse({
        type: "doc",
        content: [
          { type: "paragraph", content: [text("x", [{ type: "blink" }])] },
        ],
      }),
    ).toThrow();
  });

  it("rejects values outside the editor's choices", () => {
    const withStyle = (attrs: object) => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("x", [{ type: "textStyle", attrs }])],
        },
      ],
    });

    expect(() =>
      textContentSchema.parse(withStyle({ fontFamily: "Comic Sans MS" })),
    ).toThrow();
    expect(() =>
      textContentSchema.parse(withStyle({ fontSize: "400pt" })),
    ).toThrow();
    expect(() =>
      textContentSchema.parse(withStyle({ color: "url(x)" })),
    ).toThrow();
  });

  it("drops attributes it does not know", () => {
    const parsed = textContentSchema.parse({
      type: "doc",
      content: [{ type: "paragraph", attrs: { onclick: "alert(1)" } }],
    });

    expect(parsed.content?.[0]).toEqual({ type: "paragraph", attrs: {} });
  });
});
