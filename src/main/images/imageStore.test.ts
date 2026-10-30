import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { ImageStore } from "./imageStore";

describe("ImageStore", () => {
  it("keeps an exact copy of the original and a reduced thumbnail", async () => {
    const dir = await useTempDir();
    const source = await createTestImage(join(dir, "photo.png"), {
      width: 2000,
      height: 1000,
    });
    const store = new ImageStore(join(dir, "store"));

    const image = await store.importImage(source);

    expect(await readFile(store.originalPath(image.fileName))).toEqual(
      await readFile(source),
    );
    const thumbnail = await sharp(store.thumbnailPath(image.id)).metadata();
    expect(thumbnail).toMatchObject({
      format: "webp",
      width: 640,
      height: 320,
    });
  });

  it("does not depend on the source file after importing", async () => {
    const dir = await useTempDir();
    const source = await createTestImage(join(dir, "photo.jpg"));
    const store = new ImageStore(join(dir, "store"));

    const image = await store.importImage(source);
    await rm(source);

    await expect(
      sharp(store.originalPath(image.fileName)).metadata(),
    ).resolves.toMatchObject({ format: "jpeg" });
  });

  it("rejects unsupported formats", async () => {
    const dir = await useTempDir();
    const store = new ImageStore(join(dir, "store"));

    await expect(store.importImage(join(dir, "notes.txt"))).rejects.toThrow(
      /Unsupported image format/,
    );
  });

  it("leaves no files behind when the image cannot be decoded", async () => {
    const dir = await useTempDir();
    const source = join(dir, "broken.jpg");
    await writeFile(source, "not really a jpeg");
    const store = new ImageStore(join(dir, "store"));

    await expect(store.importImage(source)).rejects.toThrow();
    expect(await listFiles(join(dir, "store"))).toEqual([]);
  });

  it("only resolves media paths for files inside the store", () => {
    const store = new ImageStore("/data/images");
    const id = "0b5f2c1e-8a6e-4f4b-9b1a-2f0c3d4e5f60";

    expect(store.resolveMediaPath("thumbnails", `${id}.webp`)).toBe(
      join("/data/images", "thumbnails", `${id}.webp`),
    );
    expect(
      store.resolveMediaPath("thumbnails", "../artgallery.sqlite"),
    ).toBeNull();
    expect(store.resolveMediaPath("originals", `..%2F${id}.jpg`)).toBeNull();
    expect(store.resolveMediaPath("backups", `${id}.jpg`)).toBeNull();
  });
});
