import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { CollectionNameTakenError } from "./collectionService";

async function inventoryWithArtworks(titles: string[]) {
  const session = openInventory(await useTempDir());
  const ids: string[] = [];
  for (const title of titles) {
    ids.push(
      (await session.service.createArtwork({ title, imagePaths: [] })).id,
    );
  }
  return { ...session, ids };
}

describe("CollectionService", () => {
  it("creates, renames and lists collections by name", async () => {
    const { db, collections } = await inventoryWithArtworks([]);

    const port = collections.create("Puerto");
    collections.create("Obra en papel");
    collections.rename(port.id, "Serie del puerto");

    expect(collections.list()).toEqual([
      { id: expect.any(String), name: "Obra en papel", artworkCount: 0 },
      { id: port.id, name: "Serie del puerto", artworkCount: 0 },
    ]);
    db.close();
  });

  it("rejects a duplicate name ignoring case and accents", async () => {
    const { db, collections } = await inventoryWithArtworks([]);
    collections.create("Serie del puerto");
    const other = collections.create("Retratos");

    expect(() => collections.create("serie del PUERTÓ")).toThrow(
      CollectionNameTakenError,
    );
    expect(() => collections.rename(other.id, "SERIE DEL PUERTO")).toThrow(
      CollectionNameTakenError,
    );
    expect(() => collections.create("   ")).toThrow();
    db.close();
  });

  it("adds and removes artworks without duplicates", async () => {
    const { db, collections, ids } = await inventoryWithArtworks(["A", "B"]);
    const [a, b] = ids as [string, string];
    const { id } = collections.create("Serie");

    collections.setMembership(id, [a, a, b], true);
    collections.setMembership(id, [a], true);

    expect(collections.listForArtwork(a).map((c) => c.id)).toEqual([id]);
    expect(collections.list()[0]?.artworkCount).toBe(2);

    collections.setMembership(id, [a], false);
    expect(collections.list()[0]?.artworkCount).toBe(1);
    expect(collections.listForArtwork(a)).toEqual([]);
    db.close();
  });

  it("does not count artworks in the trash", async () => {
    const { db, service, collections, ids } = await inventoryWithArtworks([
      "A",
      "B",
    ]);
    const [a, b] = ids as [string, string];
    const { id } = collections.create("Serie");
    collections.setMembership(id, [a, b], true);

    service.moveToTrash([a]);
    expect(collections.list()[0]?.artworkCount).toBe(1);
    expect(
      service.listArtworks({ collections: [id] }).map((x) => x.id),
    ).toEqual([b]);

    service.restoreFromTrash([a]);
    expect(collections.list()[0]?.artworkCount).toBe(2);
    db.close();
  });

  it("deletes a collection, keeps its artworks and restores it", async () => {
    const { db, service, collections, ids } = await inventoryWithArtworks([
      "A",
      "B",
    ]);
    const { id } = collections.create("Serie");
    collections.setMembership(id, ids, true);

    const deleted = collections.delete(id);

    expect(deleted.artworkIds.sort()).toEqual([...ids].sort());
    expect(collections.list()).toEqual([]);
    expect(service.listArtworks()).toHaveLength(2);

    collections.restore(deleted);
    expect(collections.list()).toEqual([
      { id, name: "Serie", artworkCount: 2 },
    ]);
    db.close();
  });

  it("filters artworks by any of the chosen collections", async () => {
    const { db, service, collections, ids } = await inventoryWithArtworks([
      "A",
      "B",
      "C",
    ]);
    const [a, b] = ids as [string, string, string];
    const first = collections.create("Uno");
    const second = collections.create("Dos");
    collections.setMembership(first.id, [a], true);
    collections.setMembership(second.id, [b], true);

    const found = service.listArtworks({
      collections: [first.id, second.id],
    });

    expect(found.map((x) => x.id).sort()).toEqual([a, b].sort());
    db.close();
  });

  it("finds artworks by collection name in the text search", async () => {
    const { db, service, collections, ids } = await inventoryWithArtworks([
      "Marina",
      "Retrato",
    ]);
    const { id } = collections.create("Serie del Puerto");
    collections.setMembership(id, [ids[0]!], true);

    expect(service.listArtworks({ text: "puerto" }).map((x) => x.id)).toEqual([
      ids[0],
    ]);
    db.close();
  });
});
