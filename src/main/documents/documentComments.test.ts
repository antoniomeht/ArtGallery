import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

const commented = (id: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Sala 1",
          marks: [{ type: "comment", attrs: { id } }],
        },
      ],
    },
  ],
});

describe("document comments", () => {
  it("keeps comments and lists those still marked in the text", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Texto de sala");

    const kept = documents.addComment(id, "Revisar con la comisaria");
    const orphan = documents.addComment(id, "Ya no aplica");
    documents.saveContent(id, commented(kept.id));

    expect(documents.listComments(id)).toEqual([
      {
        id: kept.id,
        body: "Revisar con la comisaria",
        createdAt: expect.any(String),
      },
    ]);
    expect(orphan.id).not.toBe(kept.id);
    db.close();
  });

  it("deletes a comment", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Nota");
    const comment = documents.addComment(id, "Quitar");
    documents.saveContent(id, commented(comment.id));

    documents.deleteComment(comment.id);

    expect(documents.listComments(id)).toEqual([]);
    db.close();
  });

  it("refuses an empty comment", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Nota");

    expect(() => documents.addComment(id, "   ")).toThrow();
    db.close();
  });
});
