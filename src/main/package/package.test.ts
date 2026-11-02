import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { ZipFile } from "yazl";
import { createTestImage, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { toExportArtwork } from "./exportArtwork";
import { PackageError, type PackageErrorCode } from "./packageFormat";
import { readManifest, readPackage } from "./readPackage";
import { writePackage, type ExportArtwork } from "./writePackage";

/** An inventory with two artworks, one of them with two images. */
async function exportableInventory(dataDir: string) {
  const { db, images, service } = openInventory(dataDir);
  const photo = (name: string) => createTestImage(join(dataDir, name));
  const marina = await service.createArtwork({
    title: "Marina",
    imagePaths: [await photo("a.jpg"), await photo("b.png")],
  });
  service.updateArtwork(marina.id, {
    title: "Marina",
    artist: "Lucía Ferrer",
    tags: ["mar"],
    height: 65,
    width: 81,
    price: 1200.5,
  });
  await service.createArtwork({ title: "Boceto", imagePaths: [] });
  const artworks = service
    .listArtworks()
    .map(({ id }) => toExportArtwork(service.getArtwork(id), images));
  return { db, artworks };
}

async function zipWith(path: string, entries: Record<string, string>) {
  const zip = new ZipFile();
  for (const [name, content] of Object.entries(entries)) {
    zip.addBuffer(Buffer.from(content), name);
  }
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk as Buffer);
  await writeFile(path, Buffer.concat(chunks));
}

const MANIFEST = JSON.stringify({
  format: "artgallery",
  formatVersion: 1,
  kind: "artworks",
  createdAt: "2026-11-02T10:00:00.000Z",
  app: { name: "ArtGallery", version: "0.1.0" },
  counts: { artworks: 0, images: 0 },
});

async function expectPackageError(
  promise: Promise<unknown>,
  code: PackageErrorCode,
) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(PackageError);
  expect((error as PackageError).code).toBe(code);
}

describe("artgallery package", () => {
  it("round-trips artworks and exact copies of their images", async () => {
    const dir = await useTempDir();
    const { db, artworks } = await exportableInventory(join(dir, "data"));
    const file = join(dir, "export.artgallery");

    const manifest = await writePackage(file, {
      kind: "artworks",
      artworks,
      appVersion: "0.1.0",
    });
    const read = await readPackage(file, join(dir, "staging"));

    expect(manifest.counts).toEqual({ artworks: 2, images: 2 });
    expect(read.manifest).toEqual(manifest);
    const marina = read.data.artworks.find((a) => a.title === "Marina")!;
    expect(marina).toMatchObject({
      artist: "Lucía Ferrer",
      tags: ["mar"],
      price: 1200.5,
    });
    const source = artworks.find((a) => a.title === "Marina")!;
    for (const [index, image] of marina.images.entries()) {
      expect(await readFile(read.imagePath(image.file))).toEqual(
        await readFile(source.images[index]!.path),
      );
    }
    db.close();
  });

  it("stores only relative paths", async () => {
    const dir = await useTempDir();
    const { db, artworks } = await exportableInventory(join(dir, "data"));
    const file = join(dir, "export.artgallery");
    await writePackage(file, { kind: "backup", artworks, appVersion: "0.1.0" });

    const read = await readPackage(file, join(dir, "staging"));
    const json = JSON.stringify(read.data);

    expect(json).not.toContain(dir.replaceAll("\\", "\\\\"));
    expect(json).not.toContain(dir);
    const files = read.data.artworks.flatMap((a) =>
      a.images.map((i) => i.file),
    );
    expect(files).toHaveLength(2);
    expect(files.every((file) => file.startsWith("images/"))).toBe(true);
    db.close();
  });

  it("reads the manifest without extracting anything", async () => {
    const dir = await useTempDir();
    const { db, artworks } = await exportableInventory(join(dir, "data"));
    const file = join(dir, "backup.artgallery");
    await writePackage(file, { kind: "backup", artworks, appVersion: "0.1.0" });

    expect(await readManifest(file)).toMatchObject({
      kind: "backup",
      counts: { artworks: 2, images: 2 },
    });
    db.close();
  });

  it("leaves no file behind when writing fails", async () => {
    const dir = await useTempDir();
    const broken: ExportArtwork = {
      ...(await exportableInventory(join(dir, "data"))).artworks[0]!,
    };
    broken.images = [
      { id: "x", fileName: "missing.jpg", path: join(dir, "missing.jpg") },
    ];
    const file = join(dir, "export.artgallery");

    await expect(
      writePackage(file, {
        kind: "artworks",
        artworks: [broken],
        appVersion: "0.1.0",
      }),
    ).rejects.toThrow();
    expect(await readdir(dir)).not.toContain("export.artgallery");
    expect(await readdir(dir)).not.toContain("export.artgallery.partial");
  });

  it("rejects files that are not packages", async () => {
    const dir = await useTempDir();
    const file = join(dir, "notes.artgallery");
    await writeFile(file, "just text");

    await expectPackageError(
      readPackage(file, join(dir, "staging")),
      "not-a-package",
    );
    expect(existsSync(join(dir, "staging"))).toBe(false);
  });

  it("rejects packages from a newer format version", async () => {
    const dir = await useTempDir();
    const file = join(dir, "future.artgallery");
    await zipWith(file, {
      "manifest.json": MANIFEST.replace(
        '"formatVersion":1',
        '"formatVersion":99',
      ),
      "data.json": JSON.stringify({ artworks: [] }),
    });

    await expectPackageError(
      readPackage(file, join(dir, "staging")),
      "unsupported-version",
    );
  });

  it("still reads packages from format v1, which had no exhibitions", async () => {
    const dir = await useTempDir();
    const file = join(dir, "v1.artgallery");
    await zipWith(file, {
      "manifest.json": MANIFEST,
      "data.json": JSON.stringify({ artworks: [] }),
    });

    const read = await readPackage(file, join(dir, "staging"));

    expect(read.manifest.formatVersion).toBe(1);
    expect(read.data.exhibitions).toEqual([]);
  });

  it("rejects exhibitions that refer to artworks outside the package", async () => {
    const dir = await useTempDir();
    const file = join(dir, "broken.artgallery");
    await zipWith(file, {
      "manifest.json": MANIFEST,
      "data.json": JSON.stringify({
        artworks: [],
        exhibitions: [
          {
            id: "0b5f2c1e-8a6e-4f4b-9b1a-2f0c3d4e5f60",
            name: "Marinas",
            artworkIds: ["1b5f2c1e-8a6e-4f4b-9b1a-2f0c3d4e5f61"],
            createdAt: "2026-11-02T10:00:00.000Z",
            updatedAt: "2026-11-02T10:00:00.000Z",
          },
        ],
      }),
    });

    await expectPackageError(
      readPackage(file, join(dir, "staging")),
      "invalid-data",
    );
  });

  it("never writes outside the staging folder", async () => {
    const dir = await useTempDir();
    const staging = join(dir, "inbox", "staging");
    const file = join(dir, "evil.artgallery");
    // Same-length names patched afterwards, since yazl refuses to write "../".
    await zipWith(file, {
      "manifest.json": MANIFEST,
      "aa/aa/evil.txt": "pwned",
    });
    const bytes = await readFile(file);
    await writeFile(
      file,
      Buffer.from(
        bytes.toString("latin1").replaceAll("aa/aa/", "../../"),
        "latin1",
      ),
    );

    await expectPackageError(readPackage(file, staging), "unsafe-entry");
    expect(existsSync(join(dirname(staging), "..", "evil.txt"))).toBe(false);
    expect(existsSync(join(dir, "evil.txt"))).toBe(false);
    expect(existsSync(staging)).toBe(false);
  });

  it("rejects entries that are not part of the format", async () => {
    const dir = await useTempDir();
    const file = join(dir, "extra.artgallery");
    await zipWith(file, {
      "manifest.json": MANIFEST,
      "data.json": JSON.stringify({ artworks: [] }),
      "images/script.js": "alert(1)",
    });

    await expectPackageError(
      readPackage(file, join(dir, "staging")),
      "unsafe-entry",
    );
  });

  it("detects a damaged or missing image", async () => {
    const dir = await useTempDir();
    const id = "0b5f2c1e-8a6e-4f4b-9b1a-2f0c3d4e5f60";
    const artwork = (sha256: string) =>
      JSON.stringify({
        artworks: [
          {
            id,
            title: "Marina",
            createdAt: "2026-11-02T10:00:00.000Z",
            updatedAt: "2026-11-02T10:00:00.000Z",
            deletedAt: null,
            images: [{ id, file: `images/${id}.jpg`, sha256, bytes: 5 }],
          },
        ],
      });
    const realHash = createHash("sha256").update("photo").digest("hex");

    const tampered = join(dir, "tampered.artgallery");
    await zipWith(tampered, {
      "manifest.json": MANIFEST,
      "data.json": artwork(realHash),
      [`images/${id}.jpg`]: "PHOTO",
    });
    await expectPackageError(
      readPackage(tampered, join(dir, "s1")),
      "corrupted-image",
    );

    const missing = join(dir, "missing.artgallery");
    await zipWith(missing, {
      "manifest.json": MANIFEST,
      "data.json": artwork(realHash),
    });
    await expectPackageError(
      readPackage(missing, join(dir, "s2")),
      "missing-image",
    );
  });

  it("rejects invalid artwork data", async () => {
    const dir = await useTempDir();
    const file = join(dir, "invalid.artgallery");
    await zipWith(file, {
      "manifest.json": MANIFEST,
      "data.json": JSON.stringify({ artworks: [{ title: "" }] }),
    });

    await expectPackageError(
      readPackage(file, join(dir, "staging")),
      "invalid-data",
    );
  });
});
