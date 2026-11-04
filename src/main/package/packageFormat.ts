import { z } from "zod";
import { artworkFieldsSchema } from "../../shared/artwork";
import { exhibitionBaseSchema } from "../../shared/exhibition";
import type { PackageFailure } from "../../shared/transfer";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../../shared/media";

/**
 * Portable `.artgallery` package (a ZIP file):
 *
 *   manifest.json          what the package is, see `manifestSchema`
 *   data.json              artworks and exhibitions, see `packageDataSchema`
 *   images/<id>.<ext>      exact copies of the original images
 *
 * Paths inside the package are always relative, so a package can move to
 * another computer. Thumbnails are not included: they are rebuilt on import.
 */
export const PACKAGE_FORMAT = "artgallery";
/** v2 added exhibitions; v1 packages are still read, with none. */
export const PACKAGE_FORMAT_VERSION = 2;
export const PACKAGE_EXTENSION = ".artgallery";

export const MANIFEST_ENTRY = "manifest.json";
export const DATA_ENTRY = "data.json";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const extensions = SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.slice(1));
/** The only image entry names a package may contain. */
export const IMAGE_ENTRY = new RegExp(
  `^images/[0-9a-f-]{36}\\.(${extensions.join("|")})$`,
);

export const PACKAGE_KINDS = ["backup", "artworks"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const manifestSchema = z.object({
  format: z.literal(PACKAGE_FORMAT),
  formatVersion: z.number().int().positive(),
  /** "backup" holds the whole inventory; "artworks" holds a selection. */
  kind: z.enum(PACKAGE_KINDS),
  createdAt: z.iso.datetime(),
  app: z.object({ name: z.string(), version: z.string() }),
  counts: z.object({
    artworks: z.number().int().nonnegative(),
    images: z.number().int().nonnegative(),
  }),
});

export type PackageManifest = z.infer<typeof manifestSchema>;

export const packageImageSchema = z.object({
  id: z.string().regex(UUID),
  file: z.string().regex(IMAGE_ENTRY),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative(),
});

export type PackageImage = z.infer<typeof packageImageSchema>;

export const packageArtworkSchema = artworkFieldsSchema.extend({
  id: z.string().regex(UUID),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  /** Ordered; the first image is the primary one. */
  images: z.array(packageImageSchema),
});

export type PackageArtwork = z.infer<typeof packageArtworkSchema>;

export const packageExhibitionSchema = exhibitionBaseSchema.extend({
  id: z.string().regex(UUID),
  /** Ids of artworks in this package, in exhibition order. */
  artworkIds: z.array(z.string().regex(UUID)),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PackageExhibition = z.infer<typeof packageExhibitionSchema>;

export const packageDataSchema = z.object({
  artworks: z.array(packageArtworkSchema),
  exhibitions: z.array(packageExhibitionSchema).default([]),
});

export type PackageData = z.infer<typeof packageDataSchema>;

export type PackageErrorCode = PackageFailure;

export class PackageError extends Error {
  constructor(
    readonly code: PackageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PackageError";
  }
}
