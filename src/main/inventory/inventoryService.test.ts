import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ArtworkSummary, CreationProgress } from "../../shared/artwork";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

describe("InventoryService", () => {
  it("finds an artwork with its image after the app is reopened", async () => {
    const dataDir = await useTempDir();
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const session = openInventory(dataDir);
    const created = await session.service.createArtwork({
      title: "Bodegón con limones",
      artist: "Ana Ruiz",
      imagePaths: [photo],
    });
    session.db.close();

    const reopened = openInventory(dataDir);
    expect(reopened.service.listArtworks()).toEqual([created]);
    expect(created.primaryImageId).not.toBeNull();
    reopened.db.close();
  });

  it("creates one artwork per image, named after the file", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "IMG_2034.jpg"));
    const second = await createTestImage(join(dataDir, "Bodegón final.png"));

    const created = await service.createArtworksFromImages(
      [first, second],
      "Ana Ruiz",
    );

    expect(created.map(({ title }) => title)).toEqual([
      "IMG_2034",
      "Bodegón final",
    ]);
    const [{ id, primaryImageId }] = created as [ArtworkSummary];
    const stored = service.getArtwork(id);
    expect(stored).toMatchObject({ artist: "Ana Ruiz" });
    expect(stored.images.map((image) => image.id)).toEqual([primaryImageId]);
    db.close();
  });

  it("reports progress before importing each image", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "first.jpg"));
    const second = await createTestImage(join(dataDir, "second.png"));
    const progress: CreationProgress[] = [];

    await service.createArtworksFromImages([first, second], "", (step) =>
      progress.push(step),
    );

    expect(progress).toEqual([
      { done: 0, total: 2, fileName: "first.jpg" },
      { done: 1, total: 2, fileName: "second.png" },
    ]);
    db.close();
  });

  it("leaves the artist empty without a default", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const created = await service.createArtworksFromImages([photo], "");
    const [{ id }] = created as [ArtworkSummary];

    expect(service.getArtwork(id).artist).toBeNull();
    db.close();
  });

  it("creates nothing when one of the images cannot be imported", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const valid = await createTestImage(join(dataDir, "valid.jpg"));
    const broken = join(dataDir, "broken.jpg");
    await writeFile(broken, "not an image");

    await expect(
      service.createArtworksFromImages([valid, broken], "Ana Ruiz"),
    ).rejects.toThrow();

    expect(service.listArtworks()).toEqual([]);
    expect(await listFiles(join(dataDir, "images"))).toEqual([]);
    db.close();
  });

  it("uses the first image as the primary one", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "first.png"));
    const second = await createTestImage(join(dataDir, "second.png"));

    await service.createArtwork({
      title: "Díptico",
      imagePaths: [first, second],
    });

    const rows = db
      .prepare("SELECT id, position FROM artwork_images ORDER BY position")
      .all() as { id: string }[];
    expect(service.listArtworks()[0]?.primaryImageId).toBe(rows[0]?.id);
    db.close();
  });

  it("saves nothing when one of the images is invalid", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const valid = await createTestImage(join(dataDir, "valid.jpg"));
    const broken = join(dataDir, "broken.jpg");
    await writeFile(broken, "corrupted");

    await expect(
      service.createArtwork({ title: "Serie", imagePaths: [valid, broken] }),
    ).rejects.toThrow();

    expect(service.listArtworks()).toEqual([]);
    expect(await listFiles(join(dataDir, "images"))).toEqual([]);
    db.close();
  });

  it("saves every field of the artwork record", async () => {
    const dataDir = await useTempDir();
    const session = openInventory(dataDir);
    const { id } = await session.service.createArtwork({
      title: "Marina",
      imagePaths: [],
    });

    session.service.updateArtwork(id, {
      title: "Marina al atardecer",
      artist: "Ana Ruiz",
      category: "Pintura",
      technique: "Óleo",
      support: "Lienzo",
      year: 1998,
      yearApproximate: true,
      height: 65,
      width: 81,
      depth: 3.5,
      dimensionUnit: "cm",
      description: "Vista del puerto.",
      notes: "Marco original.",
      tags: ["mar", "puerto", "mar"],
      location: "Salón",
      status: "loaned",
      price: 1250.5,
      currency: "EUR",
    });
    session.db.close();

    const reopened = openInventory(dataDir);
    expect(reopened.service.getArtwork(id)).toMatchObject({
      title: "Marina al atardecer",
      artist: "Ana Ruiz",
      year: 1998,
      yearApproximate: true,
      depth: 3.5,
      tags: ["mar", "puerto"],
      status: "loaned",
      price: 1250.5,
    });
    reopened.db.close();
  });

  it("stores blank optional fields as empty", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const { id } = await service.createArtwork({
      title: "Boceto",
      imagePaths: [],
    });

    const updated = service.updateArtwork(id, {
      title: "Boceto",
      artist: "   ",
      notes: "",
    });

    expect(updated).toMatchObject({ artist: null, notes: null, price: null });
    db.close();
  });

  it("rejects invalid values without changing the artwork", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const { id } = await service.createArtwork({
      title: "Boceto",
      imagePaths: [],
    });

    expect(() =>
      service.updateArtwork(id, { title: "Boceto", height: -10 }),
    ).toThrow();
    expect(() =>
      service.updateArtwork(id, { title: "Boceto", currency: "euros" }),
    ).toThrow();
    expect(service.getArtwork(id).height).toBeNull();
    db.close();
  });

  it("reports when the artwork does not exist", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);

    expect(() => service.updateArtwork("missing", { title: "X" })).toThrow(
      /not found/,
    );
    db.close();
  });

  it("requires a title", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);

    await expect(
      service.createArtwork({ title: "   ", imagePaths: [] }),
    ).rejects.toThrow();
    db.close();
  });
});
