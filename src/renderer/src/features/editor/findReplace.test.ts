import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "./extensions";
import { findMatches, replaceAllTr } from "./findReplace";

const schema = getSchema(createEditorExtensions());

const docOf = (...paragraphs: (string | { bold: string; rest: string })[]) =>
  schema.nodeFromJSON({
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content:
        typeof paragraph === "string"
          ? [{ type: "text", text: paragraph }]
          : [
              { type: "text", text: paragraph.bold, marks: [{ type: "bold" }] },
              { type: "text", text: paragraph.rest },
            ],
    })),
  });

const textOf = (doc: ReturnType<typeof docOf>) =>
  doc.content.content.map((block) => block.textContent);

describe("find and replace", () => {
  it("ignores case and accents unless asked", () => {
    const doc = docOf("El Puerto de noche", "puertó y pUERTO");

    expect(findMatches(doc, "puerto", { caseSensitive: false })).toHaveLength(
      3,
    );
    expect(findMatches(doc, "Puerto", { caseSensitive: true })).toHaveLength(1);
  });

  it("finds words split by formatting but not across paragraphs", () => {
    const doc = docOf({ bold: "pin", rest: "tura" }, "pin", "tura");

    const matches = findMatches(doc, "pintura", { caseSensitive: false });

    expect(matches).toHaveLength(1);
    expect(doc.textBetween(matches[0]!.from, matches[0]!.to)).toBe("pintura");
  });

  it("replaces every match in a single undoable step", () => {
    const doc = docOf("óleo sobre lienzo", "Óleo y más óleo");
    const state = EditorState.create({ schema, doc });

    const tr = replaceAllTr(state, "oleo", "acrílico", {
      caseSensitive: false,
    });
    const next = state.apply(tr);

    expect(textOf(next.doc)).toEqual([
      "acrílico sobre lienzo",
      "acrílico y más acrílico",
    ]);
    expect(tr.steps.length).toBe(3);
  });
});
