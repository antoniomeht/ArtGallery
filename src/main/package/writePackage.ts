import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ZipFile } from "yazl";
import {
  DATA_ENTRY,
  MANIFEST_ENTRY,
  PACKAGE_FORMAT,
  PACKAGE_FORMAT_VERSION,
  type PackageArtwork,
  type PackageData,
  type PackageKind,
  type PackageManifest,
} from "./packageFormat";

/** An artwork to export: its fields plus where each original image lives. */
export type ExportArtwork = Omit<PackageArtwork, "images"> & {
  images: { id: string; fileName: string; path: string }[];
};

export interface WritePackageOptions {
  kind: PackageKind;
  artworks: readonly ExportArtwork[];
  appVersion: string;
  now?: Date;
}

/**
 * Writes a package to `destination`. It is built under a temporary name and
 * renamed at the end, so an interrupted export never leaves a file that
 * looks complete.
 */
export async function writePackage(
  destination: string,
  { kind, artworks, appVersion, now = new Date() }: WritePackageOptions,
): Promise<PackageManifest> {
  const imageCount = artworks.reduce(
    (sum, { images }) => sum + images.length,
    0,
  );
  const manifest: PackageManifest = {
    format: PACKAGE_FORMAT,
    formatVersion: PACKAGE_FORMAT_VERSION,
    kind,
    createdAt: now.toISOString(),
    app: { name: "ArtGallery", version: appVersion },
    counts: { artworks: artworks.length, images: imageCount },
  };

  const zip = new ZipFile();
  const hashes = new Map<string, { sha256: string; bytes: number }>();
  zip.addBuffer(jsonBuffer(manifest), MANIFEST_ENTRY);

  for (const artwork of artworks) {
    for (const image of artwork.images) {
      const { size } = await stat(image.path);
      // Images are already compressed; storing them avoids wasted CPU.
      zip.addReadStreamLazy(
        `images/${image.fileName}`,
        { compress: false, size },
        (callback) => {
          const hash = createHash("sha256");
          const stream = createReadStream(image.path);
          stream.on("data", (chunk) => hash.update(chunk));
          stream.on("end", () =>
            hashes.set(image.id, { sha256: hash.digest("hex"), bytes: size }),
          );
          callback(null, stream);
        },
      );
    }
  }

  // Added last and read lazily: by then every image has been hashed.
  zip.addReadStreamLazy(DATA_ENTRY, (callback) => {
    const data: PackageData = {
      artworks: artworks.map((artwork) => ({
        ...artwork,
        images: artwork.images.map(({ id, fileName }) => ({
          id,
          file: `images/${fileName}`,
          ...hashes.get(id)!,
        })),
      })),
    };
    callback(null, Readable.from([jsonBuffer(data)]));
  });
  zip.end();

  const temporary = `${destination}.partial`;
  try {
    await pipeline(zip.outputStream, createWriteStream(temporary));
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return manifest;
}

const jsonBuffer = (value: unknown) =>
  Buffer.from(JSON.stringify(value, null, 2), "utf8");
