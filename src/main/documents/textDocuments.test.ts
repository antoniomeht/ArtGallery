import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

const paragraph = (value: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

describe("text documents", () => {
  it("creates an empty text document and saves its content", async () => {
    let now = new Date("2026-11-10T10:00:00Z");
    const { db, documents } = openInventory(await useTempDir(), () => now);

    const created = documents.createText("Texto de sala");
    now = new Date("2026-11-10T10:05:00Z");
    documents.saveContent(created.id, paragraph("La exposición reúne…"));

    const saved = documents.get(created.id);
    expect(created).toMatchObject({ kind: "text", extension: null });
    expect(saved.content).toEqual(paragraph("La exposición reúne…"));
    expect(saved.updatedAt).toBe("2026-11-10T10:05:00.000Z");
    db.close();
  });

  it("refuses invalid content without writing it", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Nota");
    documents.saveContent(id, paragraph("Primera versión"));

    expect(() =>
      documents.saveContent(id, { type: "doc", content: [{ type: "script" }] }),
    ).toThrow();
    expect(documents.get(id).content).toEqual(paragraph("Primera versión"));
    db.close();
  });

  it("does not write text into an uploaded file", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    await writeFile(join(dataDir, "acta.pdf"), "%PDF");
    const {
      added: [file],
    } = await documents.uploadFiles([join(dataDir, "acta.pdf")]);

    expect(() => documents.saveContent(file!.id, paragraph("x"))).toThrow(
      /not a text document/,
    );
    db.close();
  });
});
