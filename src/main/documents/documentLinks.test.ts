import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function setup() {
  const dataDir = await useTempDir();
  const session = openInventory(dataDir);
  const paths = ["contrato.pdf", "seguro.pdf"].map((name) =>
    join(dataDir, name),
  );
  for (const path of paths) await writeFile(path, "%PDF");
  const { added } = await session.documents.uploadFiles(paths);
  const [contract, insurance] = added as [(typeof added)[0], (typeof added)[0]];
  const artwork = await session.service.createArtwork({
    title: "Lluvia sobre el puerto",
    imagePaths: [],
  });
  const exhibition = session.exhibitions.create({ name: "Mar adentro" });
  const collection = session.collections.create("Serie del puerto");
  return { ...session, contract, insurance, artwork, exhibition, collection };
}

describe("document links", () => {
  it("links documents to artworks, exhibitions and collections by name", async () => {
    const { db, documents, contract, artwork, exhibition, collection } =
      await setup();

    documents.link([contract.id], { type: "artwork", id: artwork.id });
    documents.link([contract.id], { type: "exhibition", id: exhibition.id });
    documents.link([contract.id], { type: "collection", id: collection.id });
    documents.link([contract.id], { type: "artwork", id: artwork.id });

    expect(documents.get(contract.id).links).toEqual([
      { type: "artwork", id: artwork.id, label: "Lluvia sobre el puerto" },
      { type: "exhibition", id: exhibition.id, label: "Mar adentro" },
      { type: "collection", id: collection.id, label: "Serie del puerto" },
    ]);
    const listed = documents.list({}).find(({ id }) => id === contract.id);
    expect(listed?.links).toHaveLength(3);
    db.close();
  });

  it("lists the documents linked to a target and filters by it", async () => {
    const { db, documents, contract, insurance, exhibition } = await setup();
    const target = { type: "exhibition", id: exhibition.id } as const;

    documents.link([contract.id, insurance.id], target);
    documents.unlink(insurance.id, target);

    expect(documents.listLinked(target).map(({ id }) => id)).toEqual([
      contract.id,
    ]);
    expect(documents.list({ linkedTo: target }).map(({ id }) => id)).toEqual([
      contract.id,
    ]);
    db.close();
  });

  it("drops the link when what it points to is deleted", async () => {
    const {
      db,
      service,
      exhibitions,
      collections,
      documents,
      contract,
      artwork,
      exhibition,
      collection,
    } = await setup();
    documents.link([contract.id], { type: "artwork", id: artwork.id });
    documents.link([contract.id], { type: "exhibition", id: exhibition.id });
    documents.link([contract.id], { type: "collection", id: collection.id });

    service.moveToTrash([artwork.id]);
    expect(documents.get(contract.id).links).toHaveLength(3);
    await service.deleteFromTrash([artwork.id]);
    exhibitions.delete(exhibition.id);
    collections.delete(collection.id);

    expect(documents.get(contract.id).links).toEqual([]);
    db.close();
  });

  it("brings the links back when a deleted collection is restored", async () => {
    const { db, collections, documents, contract, collection } = await setup();
    documents.link([contract.id], { type: "collection", id: collection.id });

    collections.restore(collections.delete(collection.id));

    expect(documents.get(contract.id).links.map(({ id }) => id)).toEqual([
      collection.id,
    ]);
    db.close();
  });

  it("rejects links to targets that do not exist", async () => {
    const { db, documents, contract } = await setup();

    expect(() =>
      documents.link([contract.id], { type: "artwork", id: "missing" }),
    ).toThrow(/not found/);
    db.close();
  });
});
