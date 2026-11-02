import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../database/openDatabase";
import { ImageStore } from "../images/imageStore";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { ArtworkRepository } from "./artworkRepository";
import { InventoryService } from "./inventoryService";

async function openInventory(dataDir: string) {
  const db = openDatabase(join(dataDir, "artgallery.sqlite"));
  const service = new InventoryService(
    new ArtworkRepository(db),
    new ImageStore(join(dataDir, "images")),
  );
  return { db, service };
}

describe("InventoryService", () => {
  it("finds an artwork with its image after the app is reopened", async () => {
    const dataDir = await useTempDir();
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const session = await openInventory(dataDir);
    const created = await session.service.createArtwork({
      title: "Bodegón con limones",
      artist: "Ana Ruiz",
      imagePaths: [photo],
    });
    session.db.close();

    const reopened = await openInventory(dataDir);
    expect(reopened.service.listArtworks()).toEqual([created]);
    expect(created.primaryImageId).not.toBeNull();
    reopened.db.close();
  });

  it("uses the first image as the primary one", async () => {
    const dataDir = await useTempDir();
    const { db, service } = await openInventory(dataDir);
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
    const { db, service } = await openInventory(dataDir);
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
    const session = await openInventory(dataDir);
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

    const reopened = await openInventory(dataDir);
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
    const { db, service } = await openInventory(dataDir);
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
    const { db, service } = await openInventory(dataDir);
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
    const { db, service } = await openInventory(dataDir);

    expect(() => service.updateArtwork("missing", { title: "X" })).toThrow(
      /not found/,
    );
    db.close();
  });

  it("requires a title", async () => {
    const dataDir = await useTempDir();
    const { db, service } = await openInventory(dataDir);

    await expect(
      service.createArtwork({ title: "   ", imagePaths: [] }),
    ).rejects.toThrow();
    db.close();
  });
});
