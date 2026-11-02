import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

/** Creates an artwork with `count` images and returns its id. */
async function createArtworkWithImages(dataDir: string, count: number) {
  const inventory = openInventory(dataDir);
  const paths = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      createTestImage(join(dataDir, `source-${index}.png`)),
    ),
  );
  const { id } = await inventory.service.createArtwork({
    title: "Serie",
    imagePaths: paths,
  });
  return { ...inventory, id };
}

describe("artwork images", () => {
  it("adds images after the existing ones and keeps the primary", async () => {
    const dataDir = await useTempDir();
    const { db, service, id } = await createArtworkWithImages(dataDir, 1);
    const primaryId = service.getArtwork(id).images[0]?.id;
    const extra = await createTestImage(join(dataDir, "extra.jpg"));

    const artwork = await service.addImages(id, [extra]);

    expect(artwork.images).toHaveLength(2);
    expect(artwork.images[0]?.id).toBe(primaryId);
    db.close();
  });

  it("adds nothing when one of the new images is invalid", async () => {
    const dataDir = await useTempDir();
    const { db, service, id } = await createArtworkWithImages(dataDir, 1);
    const valid = await createTestImage(join(dataDir, "valid.jpg"));
    const broken = join(dataDir, "broken.jpg");
    await writeFile(broken, "corrupted");

    await expect(service.addImages(id, [valid, broken])).rejects.toThrow();

    expect(service.getArtwork(id).images).toHaveLength(1);
    expect(await listFiles(join(dataDir, "images", "originals"))).toHaveLength(
      1,
    );
    db.close();
  });

  it("removes the image files and promotes the next image to primary", async () => {
    const dataDir = await useTempDir();
    const { db, images, service, id } = await createArtworkWithImages(
      dataDir,
      3,
    );
    const [first, second, third] = service.getArtwork(id).images;

    const artwork = await service.removeImage(id, first!.id);

    expect(artwork.images.map((image) => image.id)).toEqual([
      second!.id,
      third!.id,
    ]);
    expect(service.listArtworks()[0]?.primaryImageId).toBe(second!.id);
    expect(existsSync(images.originalPath(first!.fileName))).toBe(false);
    expect(existsSync(images.thumbnailPath(first!.id))).toBe(false);
    db.close();
  });

  it("makes any image the primary one without losing the others", async () => {
    const dataDir = await useTempDir();
    const { db, service, id } = await createArtworkWithImages(dataDir, 3);
    const [first, second, third] = service.getArtwork(id).images;

    service.setPrimaryImage(id, third!.id);
    db.close();

    const reopened = openInventory(dataDir);
    expect(
      reopened.service.getArtwork(id).images.map((image) => image.id),
    ).toEqual([third!.id, first!.id, second!.id]);
    reopened.db.close();
  });

  it("refuses to touch an image that belongs to another artwork", async () => {
    const dataDir = await useTempDir();
    const { db, service, id } = await createArtworkWithImages(dataDir, 1);
    const other = await service.createArtwork({
      title: "Otra",
      imagePaths: [],
    });
    const imageId = service.getArtwork(id).images[0]!.id;

    await expect(service.removeImage(other.id, imageId)).rejects.toThrow(
      /not found/,
    );
    expect(() => service.setPrimaryImage(other.id, imageId)).toThrow(
      /not found/,
    );
    expect(service.getArtwork(id).images).toHaveLength(1);
    db.close();
  });
});
