import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

describe("images inside text documents", () => {
  it("keeps a copy of an image for a document", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const photo = await createTestImage(join(dataDir, "plano.png"));
    const { id } = documents.createText("Montaje");

    const src = await documents.addImageAsset(id, photo);

    expect(src).toMatch(/^document-asset:[0-9a-f-]{36}\.png$/);
    expect(await listFiles(join(dataDir, "documents"))).toHaveLength(1);
    db.close();
  });

  it("refuses files that are not images", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    await writeFile(join(dataDir, "acta.pdf"), "%PDF");
    const { id } = documents.createText("Montaje");

    await expect(
      documents.addImageAsset(id, join(dataDir, "acta.pdf")),
    ).rejects.toThrow(/unsupported/);
    db.close();
  });

  it("removes the images of a purged document", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const photo = await createTestImage(join(dataDir, "plano.png"));
    const { id } = documents.createText("Montaje");
    await documents.addImageAsset(id, photo);

    documents.delete(id);
    await documents.purgeDeleted();

    expect(await listFiles(join(dataDir, "documents"))).toEqual([]);
    db.close();
  });
});
