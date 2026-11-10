import { z } from "zod";
import { optionalNumber, optionalText } from "./fields";

export const ARTWORK_STATUSES = [
  "available",
  "exhibited",
  "loaned",
  "sold",
  "other",
] as const;
export type ArtworkStatus = (typeof ARTWORK_STATUSES)[number];

const optionalMeasure = optionalNumber(z.number().positive().max(100_000));

export const measuresSchema = z.object({
  height: optionalMeasure,
  width: optionalMeasure,
  depth: optionalMeasure,
});

/** Both units; see `Dimensions`. Missing measures are null. */
const dimensionsSchema = z
  .object({ cm: measuresSchema.prefault({}), in: measuresSchema.prefault({}) })
  .prefault({});

const title = z.string().trim().min(1).max(300);

export const artworkFieldsSchema = z.object({
  title,
  artist: optionalText(300),
  category: optionalText(100),
  technique: optionalText(200),
  support: optionalText(200),
  year: optionalNumber(z.number().int().min(-5000).max(3000)),
  yearApproximate: z.boolean().default(false),
  dimensions: dimensionsSchema,
  description: optionalText(5000),
  notes: optionalText(5000),
  tags: z
    .array(z.string().trim().min(1).max(60))
    .max(50)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  location: optionalText(200),
  status: z.enum(ARTWORK_STATUSES).default("available"),
  price: optionalNumber(z.number().nonnegative().max(1e12)),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("EUR"),
});

export type ArtworkFieldsInput = z.input<typeof artworkFieldsSchema>;
export type ArtworkFields = z.output<typeof artworkFieldsSchema>;

export const newArtworkSchema = z.object({
  title,
  artist: optionalText(300),
  imagePaths: z.array(z.string().min(1)).max(50),
});

export type NewArtwork = z.input<typeof newArtworkSchema>;

export interface ArtworkImage {
  id: string;
  /** Name of the original inside the image store, e.g. `<id>.jpg`. */
  fileName: string;
}

export interface Artwork extends ArtworkFields {
  id: string;
  /** Ordered images; the first one is the primary image. */
  images: ArtworkImage[];
  /** Created from an image and not saved from its record since. */
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const ARTWORK_SORTS = [
  "recent",
  "oldest",
  "title",
  "year-asc",
  "year-desc",
] as const;
export type ArtworkSort = (typeof ARTWORK_SORTS)[number];

const filterValues = z
  .array(z.string().trim().min(1).max(300))
  .max(500)
  .optional();
const filterYear = z.number().int().min(-5000).max(3000).optional();

export const artworkFilterSchema = z.object({
  /** Free text; every word must appear in some field. */
  text: z.string().trim().max(300).optional(),
  statuses: z
    .array(z.enum(ARTWORK_STATUSES))
    .max(ARTWORK_STATUSES.length)
    .optional(),
  // Within a filter any value may match; across filters all must.
  categories: filterValues,
  artists: filterValues,
  techniques: filterValues,
  tags: filterValues,
  locations: filterValues,
  /** Collection ids. */
  collections: z.array(z.string().min(1)).max(500).optional(),
  yearFrom: filterYear,
  yearTo: filterYear,
});

export type ArtworkFilter = z.output<typeof artworkFilterSchema>;

export const artworkQuerySchema = artworkFilterSchema.extend({
  sort: z.enum(ARTWORK_SORTS).default("recent"),
});

export type ArtworkQuery = z.input<typeof artworkQuerySchema>;

/** Distinct values in the inventory, offered as choices and suggestions. */
export interface FilterOptions {
  categories: string[];
  artists: string[];
  techniques: string[];
  supports: string[];
  tags: string[];
  locations: string[];
}

export interface ArtworkSummary {
  id: string;
  title: string;
  artist: string | null;
  /** First image of the artwork, used as its cover. */
  primaryImageId: string | null;
  needsReview: boolean;
  createdAt: string;
  /** When the artwork was moved to the trash, or null if it is not there. */
  deletedAt: string | null;
}

/** Sent while artworks are created from images, before each one is imported. */
export interface CreationProgress {
  done: number;
  total: number;
  /** The image being imported now. */
  fileName: string;
}
