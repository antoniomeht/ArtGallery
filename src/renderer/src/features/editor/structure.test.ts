import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "./extensions";
import { collectHeadings, numberFootnotes } from "./structure";

const schema = getSchema(createEditorExtensions());

const doc = schema.nodeFromJSON({
  type: "doc",
  content: [
    { type: "tableOfContents" },
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Mar adentro" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Óleo" },
        { type: "footnote", attrs: { text: "Primera nota" } },
        { type: "text", text: " y acuarela" },
        { type: "footnote", attrs: { text: "Segunda nota" } },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Sala 1" }],
    },
    {
      type: "columns",
      attrs: { count: 2 },
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Marinas" }],
        },
        {
          type: "paragraph",
          content: [{ type: "footnote", attrs: { text: "Tercera nota" } }],
        },
      ],
    },
  ],
});

describe("document structure in the editor", () => {
  it("lists the headings in order with their level", () => {
    expect(
      collectHeadings(doc).map(({ level, text }) => [level, text]),
    ).toEqual([
      [1, "Mar adentro"],
      [2, "Sala 1"],
      [3, "Marinas"],
    ]);
  });

  it("numbers footnotes in reading order", () => {
    expect(
      numberFootnotes(doc).map(({ number, text }) => [number, text]),
    ).toEqual([
      [1, "Primera nota"],
      [2, "Segunda nota"],
      [3, "Tercera nota"],
    ]);
  });
});
