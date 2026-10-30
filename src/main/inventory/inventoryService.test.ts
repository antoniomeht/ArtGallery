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

  it("requires a title", async () => {
    const dataDir = await useTempDir();
    const { db, service } = await openInventory(dataDir);

    await expect(
      service.createArtwork({ title: "   ", imagePaths: [] }),
    ).rejects.toThrow();
    db.close();
  });
});
