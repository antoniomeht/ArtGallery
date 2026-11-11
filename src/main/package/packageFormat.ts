import { z } from "zod";
import { artworkFieldsSchema } from "../../shared/artwork";
import { DIMENSION_UNITS, fromSingleUnit } from "../../shared/dimensions";
import { exhibitionBaseSchema } from "../../shared/exhibition";
import { collectionNameSchema } from "../../shared/collection";
import { commentBodySchema, documentFieldsSchema } from "../../shared/document";
import {
  DOCUMENT_EXTENSIONS,
  documentExtension,
} from "../../shared/documentFormats";
import { textContentSchema } from "../../shared/editorSchema";
import { pageSetupSchema } from "../../shared/pageSetup";
import type { PackageFailure } from "../../shared/transfer";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../../shared/media";

/**
 * Portable `.artgallery` package (a ZIP file):
 *
 *   manifest.json          what the package is, see `manifestSchema`
 *   data.json              artworks and exhibitions, see `packageDataSchema`
 *   images/<id>.<ext>      exact copies of the original images
 *   documents/<id>.<ext>   uploaded documents and images of text documents
 *
 * Paths inside the package are always relative, so a package can move to
 * another computer. Thumbnails are not included: they are rebuilt on import.
 */
export const PACKAGE_FORMAT = "artgallery";
/**
 * v2 added exhibitions; v3 keeps measures in both units; v4 adds collections
 * and documents. Older packages are still read: v1 with no exhibitions,
 * v1–v2 measures are converted, and v1–v3 have no collections or documents.
 */
export const PACKAGE_FORMAT_VERSION = 4;
export const PACKAGE_EXTENSION = ".artgallery";

export const MANIFEST_ENTRY = "manifest.json";
export const DATA_ENTRY = "data.json";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const extensions = SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.slice(1));
/** The only image entry names a package may contain. */
export const IMAGE_ENTRY = new RegExp(
  `^images/[0-9a-f-]{36}\\.(${extensions.join("|")})$`,
);

/** The only document entry names a package may contain. */
export const DOCUMENT_ENTRY = new RegExp(
  `^documents/[0-9a-f-]{36}\\.(${DOCUMENT_EXTENSIONS.join("|")})$`,
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
    documents: z.number().int().nonnegative().default(0),
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
  /** Missing in packages written before it existed. */
  favorite: z.boolean().default(false),
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

export const packageCollectionSchema = z.object({
  id: z.string().regex(UUID),
  name: collectionNameSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Ids of artworks in this package. */
  artworkIds: z.array(z.string().regex(UUID)),
});

export type PackageCollection = z.infer<typeof packageCollectionSchema>;

/** A file kept for a document, checked like the images. */
const packageFileSchema = z.object({
  file: z.string().regex(DOCUMENT_ENTRY),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative(),
});

export type PackageFile = z.infer<typeof packageFileSchema>;

export const packageDocumentSchema = z
  .object({
    id: z.string().regex(UUID),
    title: documentFieldsSchema.shape.title,
    notes: documentFieldsSchema.shape.notes,
    kind: z.enum(["file", "text"]),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    /** The uploaded file of a `file` document. */
    file: packageFileSchema
      .extend({
        originalName: z.string().min(1).max(260),
        extension: z.enum(DOCUMENT_EXTENSIONS),
      })
      .nullable(),
    content: textContentSchema.nullable(),
    pageSetup: pageSetupSchema.nullable(),
    /** Images copied for a `text` document. */
    assets: z.array(packageFileSchema).default([]),
    comments: z
      .array(
        z.object({
          id: z.string().regex(UUID),
          body: commentBodySchema,
          createdAt: z.iso.datetime(),
        }),
      )
      .default([]),
    links: z.object({
      artworks: z.array(z.string().regex(UUID)).default([]),
      exhibitions: z.array(z.string().regex(UUID)).default([]),
      collections: z.array(z.string().regex(UUID)).default([]),
    }),
  })
  .refine(
    (document) =>
      document.kind === "file"
        ? document.file !== null && document.content === null
        : document.file === null && document.content !== null,
    { message: "A document is either an uploaded file or a text" },
  )
  // The name must not claim another format: copies opened outside the app
  // use it, and a ".exe" name on a stored PDF must never reach the system.
  .refine(
    ({ file }) =>
      !file || documentExtension(file.originalName) === file.extension,
    { message: "The file name does not match its format" },
  );

export type PackageDocument = z.infer<typeof packageDocumentSchema>;

export const packageDataSchema = z.object({
  artworks: z.array(packageArtworkSchema),
  exhibitions: z.array(packageExhibitionSchema).default([]),
  collections: z.array(packageCollectionSchema).default([]),
  documents: z.array(packageDocumentSchema).default([]),
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
