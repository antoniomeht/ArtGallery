import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function createArtworks(dataDir: string, titles: string[]) {
  const inventory = openInventory(dataDir);
  const ids: string[] = [];
  for (const [index, title] of titles.entries()) {
    const image = await createTestImage(join(dataDir, `source-${index}.png`));
    const artwork = await inventory.service.createArtwork({
      title,
      imagePaths: [image],
    });
    ids.push(artwork.id);
  }
  return { ...inventory, ids };
}

const titlesOf = (artworks: { title: string }[]) =>
  artworks.map((artwork) => artwork.title).sort();

describe("trash", () => {
  it("hides trashed artworks from the gallery and keeps them recoverable", async () => {
    const dataDir = await useTempDir();
    const { db, service, ids } = await createArtworks(dataDir, [
      "Marina",
      "Retrato",
    ]);

    service.moveToTrash([ids[0]!]);
    db.close();

    const reopened = openInventory(dataDir);
    expect(titlesOf(reopened.service.listArtworks())).toEqual(["Retrato"]);
    expect(titlesOf(reopened.service.listTrash())).toEqual(["Marina"]);

    reopened.service.restoreFromTrash([ids[0]!]);
    expect(titlesOf(reopened.service.listArtworks())).toEqual([
      "Marina",
      "Retrato",
    ]);
    expect(reopened.service.listTrash()).toEqual([]);
    reopened.db.close();
  });

  it("keeps the images of trashed artworks on disk", async () => {
    const dataDir = await useTempDir();
    const { db, service, ids } = await createArtworks(dataDir, ["Marina"]);

    service.moveToTrash(ids);

    expect(await listFiles(join(dataDir, "images"))).toHaveLength(2);
    db.close();
  });

  it("deletes artworks and their files permanently from the trash", async () => {
    const dataDir = await useTempDir();
    const { db, service, ids } = await createArtworks(dataDir, [
      "Marina",
      "Retrato",
    ]);
    service.moveToTrash(ids);

    await service.deleteFromTrash([ids[0]!]);

    expect(titlesOf(service.listTrash())).toEqual(["Retrato"]);
    expect(() => service.getArtwork(ids[0]!)).toThrow(/not found/);
    expect(await listFiles(join(dataDir, "images"))).toHaveLength(2);
    db.close();
  });

  it("never deletes artworks that are not in the trash", async () => {
    const dataDir = await useTempDir();
    const { db, service, ids } = await createArtworks(dataDir, ["Marina"]);

    await service.deleteFromTrash(ids);
    await service.deleteFromTrash();

    expect(titlesOf(service.listArtworks())).toEqual(["Marina"]);
    expect(await listFiles(join(dataDir, "images"))).toHaveLength(2);
    db.close();
  });

  it("empties the whole trash", async () => {
    const dataDir = await useTempDir();
    const { db, service, ids } = await createArtworks(dataDir, [
      "Marina",
      "Retrato",
      "Bodegón",
    ]);
    service.moveToTrash([ids[0]!, ids[1]!]);

    await service.deleteFromTrash();

    expect(service.listTrash()).toEqual([]);
    expect(titlesOf(service.listArtworks())).toEqual(["Bodegón"]);
    expect(await listFiles(join(dataDir, "images"))).toHaveLength(2);
    db.close();
  });
});
