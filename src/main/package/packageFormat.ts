import { z } from "zod";
import { artworkFieldsSchema } from "../../shared/artwork";
import { DIMENSION_UNITS, fromSingleUnit } from "../../shared/dimensions";
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
/**
 * v2 added exhibitions; v3 keeps measures in both units. Older packages are
 * still read: v1 with no exhibitions, and v1–v2 measures are converted.
 */
export const PACKAGE_FORMAT_VERSION = 3;
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

/** Measures of packages before v3: one set, in the artwork's own unit. */
const legacyMeasuresSchema = z.object({
  height: z.number().nullish(),
  width: z.number().nullish(),
  depth: z.number().nullish(),
  dimensionUnit: z.enum(DIMENSION_UNITS).default("cm"),
});

function withBothUnits(artwork: unknown): unknown {
  if (typeof artwork !== "object" || artwork === null) return artwork;
  if ("dimensions" in artwork) return artwork;
  const legacy = legacyMeasuresSchema.safeParse(artwork);
  if (!legacy.success) return artwork;
  const { height, width, depth, dimensionUnit } = legacy.data;
  return {
    ...artwork,
    dimensions: fromSingleUnit(
      { height: height ?? null, width: width ?? null, depth: depth ?? null },
      dimensionUnit,
    ),
  };
}

const currentArtworkSchema = artworkFieldsSchema.extend({
  id: z.string().regex(UUID),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  /** Missing in packages written before it existed. */
  needsReview: z.boolean().default(false),
  /** Ordered; the first image is the primary one. */
  images: z.array(packageImageSchema),
});

export const packageArtworkSchema = z.preprocess(
  withBothUnits,
  currentArtworkSchema,
);

export type PackageArtwork = z.infer<typeof currentArtworkSchema>;

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
