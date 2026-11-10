import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestImage, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { TransferService } from "./transferService";

function openComputer(root: string, name: string) {
  const dataDir = join(root, name);
  const inventory = openInventory(dataDir);
  const transfer = new TransferService({
    inventory: inventory.service,
    exhibitions: inventory.exhibitions,
    collections: inventory.collections,
    images: inventory.images,
    workDir: join(dataDir, "tmp"),
    appVersion: "0.1.0",
  });
  return { ...inventory, transfer, dataDir };
}

async function addArtwork(
  computer: ReturnType<typeof openComputer>,
  title: string,
) {
  const photo = await createTestImage(join(computer.dataDir, `${title}.png`));
  return computer.service.createArtwork({ title, imagePaths: [photo] });
}

const collectionsOf = (computer: ReturnType<typeof openComputer>) =>
  computer.collections
    .list()
    .map(({ name, artworkCount }) => [name, artworkCount]);

describe("collections in exported selections", () => {
  it("carries collection names and creates the missing ones on import", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    const marina = await addArtwork(studio, "Marina");
    const retrato = await addArtwork(studio, "Retrato");
    const port = studio.collections.create("Serie del puerto");
    studio.collections.setMembership(port.id, [marina.id, retrato.id], true);
    const file = join(root, "seleccion.artgallery");
    await studio.transfer.exportPackage(file, [marina.id]);

    const home = openComputer(root, "home");
    home.collections.create("serie del PUERTO");
    const preview = await home.transfer.previewImport(file);
    if (!preview.ok) throw new Error(preview.reason);
    await home.transfer.applyImport(preview.preview.sessionId, "copy");

    expect(collectionsOf(home)).toEqual([["serie del PUERTO", 1]]);
    studio.db.close();
    home.db.close();
  });

  it("keeps the collections and documents of an artwork replaced on import", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    const marina = await addArtwork(studio, "Marina");
    const file = join(root, "marina.artgallery");
    await studio.transfer.exportPackage(file, [marina.id]);
    const paper = studio.collections.create("Obra en papel");
    studio.collections.setMembership(paper.id, [marina.id], true);
    const pdfPath = join(studio.dataDir, "certificado.pdf");
    await writeFile(pdfPath, "%PDF");
    const {
      added: [pdf],
    } = await studio.documents.uploadFiles([pdfPath]);
    studio.documents.link([pdf!.id], { type: "artwork", id: marina.id });

    const preview = await studio.transfer.previewImport(file);
    if (!preview.ok) throw new Error(preview.reason);
    await studio.transfer.applyImport(preview.preview.sessionId, "replace");

    expect(collectionsOf(studio)).toEqual([["Obra en papel", 1]]);
    expect(studio.documents.get(pdf!.id).links).toHaveLength(1);
    studio.db.close();
  });
});
