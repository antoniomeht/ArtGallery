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
  type PackageCollection,
  type PackageData,
  type PackageDocument,
  type PackageExhibition,
  type PackageKind,
  type PackageManifest,
} from "./packageFormat";

/** An artwork to export: its fields plus where each original image lives. */
export type ExportArtwork = Omit<PackageArtwork, "images"> & {
  images: { id: string; fileName: string; path: string }[];
};

/** A stored file of a document and where it is now. */
export interface ExportFile {
  fileName: string;
  path: string;
}

/** A document to export: its data plus where its files live. */
export type ExportDocument = Omit<PackageDocument, "file" | "assets"> & {
  file: (ExportFile & { originalName: string; extension: string }) | null;
  assets: ExportFile[];
};

export interface WritePackageOptions {
  kind: PackageKind;
  artworks: readonly ExportArtwork[];
  /** Must only refer to artworks in `artworks`. */
  exhibitions?: readonly PackageExhibition[];
  /** Must only refer to artworks in `artworks`. */
  collections?: readonly PackageCollection[];
  /** Links must only refer to what the package holds. */
  documents?: readonly ExportDocument[];
  appVersion: string;
  now?: Date;
  dataHash?: string;
}

/**
 * Writes a package to `destination`. It is built under a temporary name and
 * renamed at the end, so an interrupted export never leaves a file that
 * looks complete.
 */
export async function writePackage(
  destination: string,
  {
    kind,
    artworks,
    exhibitions = [],
    collections = [],
    documents = [],
    appVersion,
    now = new Date(),
    dataHash,
  }: WritePackageOptions,
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
    counts: {
      artworks: artworks.length,
      images: imageCount,
      documents: documents.length,
    },
    ...(dataHash ? { dataHash } : {}),
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

  const fileHashes = new Map<string, { sha256: string; bytes: number }>();
  const documentFiles = documents.flatMap((document) => [
    ...(document.file ? [document.file] : []),
    ...document.assets,
  ]);
  for (const file of documentFiles) {
    const entry = `documents/${file.fileName}`;
    const { size } = await stat(file.path);
    zip.addReadStreamLazy(entry, { size }, (callback) => {
      const hash = createHash("sha256");
      const stream = createReadStream(file.path);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () =>
        fileHashes.set(entry, { sha256: hash.digest("hex"), bytes: size }),
      );
      callback(null, stream);
    });
  }
  const packaged = (file: ExportFile) => {
    const entry = `documents/${file.fileName}`;
    return { file: entry, ...fileHashes.get(entry)! };
  };

  // Added last and read lazily: by then every file has been hashed.
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
      exhibitions: [...exhibitions],
      collections: [...collections],
      documents: documents.map(({ file, assets, ...document }) => ({
        ...document,
        file: file
          ? {
              ...packaged(file),
              originalName: file.originalName,
              extension: file.extension as NonNullable<
                PackageDocument["file"]
              >["extension"],
            }
          : null,
        assets: assets.map(packaged),
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
