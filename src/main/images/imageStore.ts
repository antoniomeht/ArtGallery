import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

export const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
];

const THUMBNAIL_MAX_SIZE = 640;
const STORED_FILE_NAME = /^[0-9a-f-]{36}\.[a-z]{3,4}$/;

export type MediaKind = "originals" | "thumbnails";

export interface StoredImage {
  id: string;
  /** Name of the original inside the store, e.g. `<id>.jpg`. */
  fileName: string;
}

/**
 * Keeps a private copy of every original plus a WebP thumbnail, so artworks
 * keep working when the user moves or deletes the source photo.
 */
export class ImageStore {
  constructor(private readonly rootDir: string) {}

  async importImage(sourcePath: string): Promise<StoredImage> {
    const extension = extname(sourcePath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
      throw new Error(`Unsupported image format: ${extension || "unknown"}`);
    }

    const id = randomUUID();
    const image: StoredImage = { id, fileName: `${id}${extension}` };
    const originalPath = this.originalPath(image.fileName);
    const thumbnailPath = this.thumbnailPath(id);

    await Promise.all([
      mkdir(join(this.rootDir, "originals"), { recursive: true }),
      mkdir(join(this.rootDir, "thumbnails"), { recursive: true }),
    ]);

    // Write to temporary names first so a crash never leaves a half-written
    // file under a final name. Decoding the thumbnail also validates the image.
    try {
      await sharp(sourcePath)
        .rotate()
        .resize(THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toFile(`${thumbnailPath}.tmp`);
      await copyFile(sourcePath, `${originalPath}.tmp`);
      await rename(`${thumbnailPath}.tmp`, thumbnailPath);
      await rename(`${originalPath}.tmp`, originalPath);
    } catch (error) {
      await this.deleteImage(image);
      throw error;
    }

    return image;
  }

  async deleteImage(image: StoredImage): Promise<void> {
    const paths = [
      this.originalPath(image.fileName),
      this.thumbnailPath(image.id),
    ];
    await Promise.all(
      paths.flatMap((path) => [
        rm(path, { force: true }),
        rm(`${path}.tmp`, { force: true }),
      ]),
    );
  }

  /** Maps a media URL to a file inside the store, or null if it is not one. */
  resolveMediaPath(kind: string, fileName: string): string | null {
    if (!STORED_FILE_NAME.test(fileName)) return null;
    if (kind === "originals") return join(this.rootDir, kind, fileName);
    if (kind === "thumbnails" && fileName.endsWith(".webp")) {
      return join(this.rootDir, kind, fileName);
    }
    return null;
  }

  originalPath(fileName: string): string {
    return join(this.rootDir, "originals", fileName);
  }

  thumbnailPath(imageId: string): string {
    return join(this.rootDir, "thumbnails", `${imageId}.webp`);
  }
}
