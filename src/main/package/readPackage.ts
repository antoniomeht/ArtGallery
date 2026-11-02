import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import type { ZodType } from "zod";
import {
  DATA_ENTRY,
  IMAGE_ENTRY,
  MANIFEST_ENTRY,
  manifestSchema,
  PACKAGE_FORMAT_VERSION,
  packageDataSchema,
  PackageError,
  type PackageData,
  type PackageManifest,
} from "./packageFormat";

/** Guards against zip bombs: JSON entries are small even for big inventories. */
const MAX_JSON_BYTES = 64 * 1024 * 1024;

export interface ValidatedPackage {
  manifest: PackageManifest;
  data: PackageData;
  /** Folder holding the extracted images, named `<id>.<ext>`. */
  imagesDir: string;
  /** Path of an extracted image, as listed in `data`. */
  imagePath: (file: string) => string;
}

/** Reads only the manifest, e.g. to list backups without extracting them. */
export async function readManifest(path: string): Promise<PackageManifest> {
  const zip = await openZip(path);
  try {
    for await (const entry of entriesOf(zip)) {
      if (entry.fileName === MANIFEST_ENTRY) {
        return parseManifest(await readJson(zip, entry));
      }
    }
  } finally {
    zip.close();
  }
  throw new PackageError("not-a-package", "The package has no manifest.");
}

/**
 * Validates a package completely and extracts its images into `stagingDir`.
 * Nothing is written outside `stagingDir`, and on any problem the folder is
 * removed and a `PackageError` explains why.
 */
export async function readPackage(
  path: string,
  stagingDir: string,
): Promise<ValidatedPackage> {
  await mkdir(stagingDir, { recursive: true });
  try {
    return await extract(path, stagingDir);
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

async function extract(
  path: string,
  stagingDir: string,
): Promise<ValidatedPackage> {
  const zip = await openZip(path);
  let manifest: PackageManifest | undefined;
  let rawData: unknown;
  const extracted = new Map<string, { sha256: string; bytes: number }>();

  try {
    for await (const entry of entriesOf(zip)) {
      const name = entry.fileName;
      if (name === MANIFEST_ENTRY && !manifest) {
        manifest = parseManifest(await readJson(zip, entry));
      } else if (name === DATA_ENTRY && rawData === undefined) {
        rawData = await readJson(zip, entry);
      } else if (IMAGE_ENTRY.test(name) && !extracted.has(name)) {
        // The file name comes from a validated pattern, never from free text.
        const target = join(stagingDir, basename(name));
        extracted.set(name, await extractImage(zip, entry, target));
      } else {
        throw new PackageError(
          "unsafe-entry",
          `Unexpected entry in package: ${name}`,
        );
      }
    }
  } finally {
    zip.close();
  }

  if (!manifest) {
    throw new PackageError("not-a-package", "The package has no manifest.");
  }
  const data = parse(packageDataSchema, rawData, "data.json is not valid.");
  checkImages(data, extracted);

  return {
    manifest,
    data,
    imagesDir: stagingDir,
    imagePath: (file) => join(stagingDir, basename(file)),
  };
}

/** Every listed image must be present and intact, and nothing more. */
function checkImages(
  data: PackageData,
  extracted: Map<string, { sha256: string; bytes: number }>,
): void {
  const listed = new Set<string>();
  for (const image of data.artworks.flatMap((artwork) => artwork.images)) {
    const actual = extracted.get(image.file);
    if (!actual) {
      throw new PackageError("missing-image", `Missing image: ${image.file}`);
    }
    if (actual.sha256 !== image.sha256 || actual.bytes !== image.bytes) {
      throw new PackageError(
        "corrupted-image",
        `Image does not match its checksum: ${image.file}`,
      );
    }
    listed.add(image.file);
  }
  const unlisted = [...extracted.keys()].find((file) => !listed.has(file));
  if (unlisted) {
    throw new PackageError("unsafe-entry", `Unlisted image: ${unlisted}`);
  }
}

function parseManifest(raw: unknown): PackageManifest {
  const manifest = parse(manifestSchema, raw, "manifest.json is not valid.");
  if (manifest.formatVersion > PACKAGE_FORMAT_VERSION) {
    throw new PackageError(
      "unsupported-version",
      `Package format v${manifest.formatVersion} is newer than this app supports (v${PACKAGE_FORMAT_VERSION}).`,
    );
  }
  return manifest;
}

function parse<T>(schema: ZodType<T>, raw: unknown, message: string): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new PackageError("invalid-data", message);
  return result.data;
}

async function openZip(path: string): Promise<ZipFile> {
  try {
    return await yauzl.openPromise(path, {
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });
  } catch {
    throw new PackageError("not-a-package", "The file is not a valid package.");
  }
}

/** Wraps yauzl's async iterator, which its type definitions do not declare. */
function entriesOf(zip: ZipFile): AsyncIterable<Entry> {
  const iterable = (
    zip as ZipFile & { eachEntry(): AsyncIterable<Entry> }
  ).eachEntry();
  return {
    async *[Symbol.asyncIterator]() {
      try {
        yield* iterable;
      } catch (error) {
        if (error instanceof PackageError) throw error;
        // yauzl rejects names such as "../x" or "/x" before we see them.
        const message = error instanceof Error ? error.message : "";
        if (/relative path|absolute path|invalid characters/.test(message)) {
          throw new PackageError("unsafe-entry", message);
        }
        throw new PackageError("not-a-package", "The package is damaged.");
      }
    },
  };
}

async function readJson(zip: ZipFile, entry: Entry): Promise<unknown> {
  if (entry.uncompressedSize > MAX_JSON_BYTES) {
    throw new PackageError("invalid-data", `${entry.fileName} is too large.`);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of await openEntry(zip, entry)) {
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PackageError("invalid-data", `${entry.fileName} is not JSON.`);
  }
}

async function extractImage(
  zip: ZipFile,
  entry: Entry,
  target: string,
): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash("sha256");
  let bytes = 0;
  const measure = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      bytes += chunk.length;
      callback(null, chunk);
    },
  });
  await pipeline(
    await openEntry(zip, entry),
    measure,
    createWriteStream(target),
  );
  return { sha256: hash.digest("hex"), bytes };
}

async function openEntry(zip: ZipFile, entry: Entry): Promise<Readable> {
  try {
    return await zip.openReadStreamPromise(entry);
  } catch {
    throw new PackageError("not-a-package", "The package is damaged.");
  }
}
