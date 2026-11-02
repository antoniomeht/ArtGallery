import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestImage, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { TransferService } from "./transferService";

/** One computer: its own inventory and transfer service. */
function openComputer(root: string, name: string) {
  const dataDir = join(root, name);
  const inventory = openInventory(dataDir);
  const transfer = new TransferService({
    inventory: inventory.service,
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

const titles = (computer: ReturnType<typeof openComputer>) =>
  computer.service
    .listArtworks({ sort: "title" })
    .map((artwork) => artwork.title);

describe("export and import", () => {
  it("moves a selection with its images to another computer", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    const marina = await addArtwork(studio, "Marina");
    await addArtwork(studio, "Retrato");
    studio.service.updateArtwork(marina.id, { title: "Marina", tags: ["mar"] });
    const file = join(root, "marina.artgallery");

    expect(await studio.transfer.exportPackage(file, [marina.id])).toEqual({
      path: file,
      artworks: 1,
    });

    const home = openComputer(root, "home");
    const preview = await home.transfer.previewImport(file);
    expect(preview).toMatchObject({
      ok: true,
      preview: { newCount: 1, duplicates: [], trashedSkipped: 0 },
    });
    expect(titles(home)).toEqual([]);

    const { sessionId } = (preview as { preview: { sessionId: string } })
      .preview;
    expect(await home.transfer.applyImport(sessionId, "skip")).toEqual({
      added: 1,
      replaced: 0,
      skipped: 0,
    });
    const imported = home.service.getArtwork(marina.id);
    expect(imported).toMatchObject({ title: "Marina", tags: ["mar"] });
    expect(
      await readFile(home.images.originalPath(imported.images[0]!.fileName)),
    ).toEqual(
      await readFile(
        studio.images.originalPath(
          studio.service.getArtwork(marina.id).images[0]!.fileName,
        ),
      ),
    );
    expect(await readdir(join(home.dataDir, "tmp"))).toEqual([]);
    studio.db.close();
    home.db.close();
  });

  it("handles artworks that already exist as the user chooses", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    const marina = await addArtwork(studio, "Marina");
    const file = join(root, "all.artgallery");
    await studio.transfer.exportPackage(file, null);
    studio.service.updateArtwork(marina.id, { title: "Marina (editada)" });

    const importWith = async (policy: "skip" | "replace" | "copy") => {
      const result = await studio.transfer.previewImport(file);
      if (!result.ok) throw new Error(result.reason);
      expect(result.preview.duplicates).toEqual([
        { id: marina.id, title: "Marina" },
      ]);
      return studio.transfer.applyImport(result.preview.sessionId, policy);
    };

    expect(await importWith("skip")).toMatchObject({ skipped: 1 });
    expect(titles(studio)).toEqual(["Marina (editada)"]);

    expect(await importWith("replace")).toMatchObject({ replaced: 1 });
    expect(titles(studio)).toEqual(["Marina"]);
    expect(
      await readdir(join(studio.dataDir, "images", "originals")),
    ).toHaveLength(1);

    expect(await importWith("copy")).toMatchObject({ added: 1 });
    expect(titles(studio)).toEqual(["Marina", "Marina"]);
    studio.db.close();
  });

  it("does not export artworks in the trash", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    const marina = await addArtwork(studio, "Marina");
    await addArtwork(studio, "Retrato");
    studio.service.moveToTrash([marina.id]);

    const result = await studio.transfer.exportPackage(
      join(root, "all.artgallery"),
      null,
    );

    expect(result.artworks).toBe(1);
    studio.db.close();
  });

  it("rejects a damaged package without touching the inventory", async () => {
    const root = await useTempDir();
    const home = openComputer(root, "home");
    await addArtwork(home, "Marina");
    const damaged = join(root, "damaged.artgallery");
    await writeFile(damaged, "not a package");

    expect(await home.transfer.previewImport(damaged)).toEqual({
      ok: false,
      reason: "not-a-package",
    });
    expect(titles(home)).toEqual(["Marina"]);
    home.db.close();
  });

  it("cleans up when an import is cancelled", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    await addArtwork(studio, "Marina");
    const file = join(root, "all.artgallery");
    await studio.transfer.exportPackage(file, null);
    const home = openComputer(root, "home");

    const result = await home.transfer.previewImport(file);
    if (!result.ok) throw new Error(result.reason);
    await home.transfer.cancelImport(result.preview.sessionId);

    expect(await readdir(join(home.dataDir, "tmp"))).toEqual([]);
    expect(titles(home)).toEqual([]);
    await expect(
      home.transfer.applyImport(result.preview.sessionId, "skip"),
    ).rejects.toThrow(/Unknown import session/);
    studio.db.close();
    home.db.close();
  });

  it("exports metadata to CSV", async () => {
    const root = await useTempDir();
    const studio = openComputer(root, "studio");
    await addArtwork(studio, "Marina");
    const file = join(root, "inventario.csv");

    await studio.transfer.exportCsv(file, null);

    const csv = await readFile(file, "utf8");
    expect(csv.split("\r\n")[1]).toContain(";Marina;");
    studio.db.close();
  });
});
