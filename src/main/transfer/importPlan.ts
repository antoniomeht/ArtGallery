import type { Exhibition } from "../../shared/exhibition";
import { isSameInventoryNumber } from "../../shared/inventoryNumbers";
import type { DuplicatePolicy } from "../../shared/transfer";
import type {
  PackageArtwork,
  PackageCollection,
  PackageExhibition,
} from "../package/packageFormat";

export interface ImportPlan {
  fresh: PackageArtwork[];
  /** Artworks whose id already exists in the inventory. */
  duplicates: PackageArtwork[];
  /** Artworks that were in the trash where the package was made. */
  trashedSkipped: number;
  freshExhibitions: PackageExhibition[];
  duplicateExhibitions: PackageExhibition[];
  /** Matched by name on import; their own ids do not travel. */
  collections: PackageCollection[];
}

/** Sorts the contents of a package before anything is written. */
export function planImport(
  {
    artworks,
    exhibitions,
    collections = [],
  }: {
    artworks: readonly PackageArtwork[];
    exhibitions: readonly PackageExhibition[];
    collections?: readonly PackageCollection[];
  },
  existing: {
    artworkIds: ReadonlySet<string>;
    exhibitionIds: ReadonlySet<string>;
  },
): ImportPlan {
  const plan: ImportPlan = {
    fresh: [],
    duplicates: [],
    trashedSkipped: 0,
    freshExhibitions: [],
    duplicateExhibitions: [],
    collections: [...collections],
  };
  for (const artwork of uniqueById(artworks)) {
    if (artwork.deletedAt) plan.trashedSkipped++;
    else if (existing.artworkIds.has(artwork.id)) plan.duplicates.push(artwork);
    else plan.fresh.push(artwork);
  }
  for (const exhibition of uniqueById(exhibitions)) {
    if (existing.exhibitionIds.has(exhibition.id)) {
      plan.duplicateExhibitions.push(exhibition);
    } else {
      plan.freshExhibitions.push(exhibition);
    }
  }
  return plan;
}

export interface ResolvedImport {
  /** Artworks to write; any with an existing id replaces it. */
  artworks: PackageArtwork[];
  /** Exhibitions to write, pointing at the final artwork ids. */
  exhibitions: Exhibition[];
  /** Collections by name, pointing at the final artwork ids. */
  collections: { name: string; artworkIds: string[] }[];
  added: number;
  replaced: number;
  skipped: number;
  /** Artworks left without their number because another one has it. */
  withoutNumber: number;
}

/**
 * Applies the user's choice for duplicates. The same choice covers artworks
 * and exhibitions, and exhibitions follow artworks that get a new id.
 * `numberedArtworks` are the artworks of the inventory that have a number.
 */
export function resolveImport(
  plan: ImportPlan,
  policy: DuplicatePolicy,
  {
    newId,
    now,
    numberedArtworks,
  }: {
    newId: () => string;
    now: Date;
    numberedArtworks: readonly { id: string; inventoryNumber: string }[];
  },
): ResolvedImport {
  const timestamp = now.toISOString();
  const copy = <T extends { id: string }>(item: T): T => ({
    ...item,
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const pick = <T>(items: T[], copyItem: (item: T) => T): T[] => {
    switch (policy) {
      case "skip":
        return [];
      case "replace":
        return items;
      case "copy":
        return items.map(copyItem);
    }
  };

  // Copied artworks get a new id; exhibitions must point at the copy.
  const renamed = new Map<string, string>();
  const duplicates = pick(plan.duplicates, (artwork) => {
    const copied = copy(artwork);
    renamed.set(artwork.id, copied.id);
    return copied;
  });
  const exhibitions = [
    ...plan.freshExhibitions,
    ...pick(plan.duplicateExhibitions, copy),
  ].map((exhibition) => ({
    ...exhibition,
    artworkIds: exhibition.artworkIds.map((id) => renamed.get(id) ?? id),
  }));

  const { artworks, withoutNumber } = withFreeNumbers(
    [...plan.fresh, ...duplicates],
    numberedArtworks,
  );
  return {
    artworks,
    exhibitions,
    collections: plan.collections.map(({ name, artworkIds }) => ({
      name,
      artworkIds: artworkIds.map((id) => renamed.get(id) ?? id),
    })),
    added: plan.fresh.length + (policy === "copy" ? duplicates.length : 0),
    replaced: policy === "replace" ? duplicates.length : 0,
    skipped: policy === "skip" ? plan.duplicates.length : 0,
    withoutNumber,
  };
}

/**
 * An artwork keeps its inventory number unless an artwork that stays in the
 * inventory, or one imported before it, already has it. Without it, the
 * artwork is marked for review so the user can give it another one.
 */
function withFreeNumbers(
  artworks: readonly PackageArtwork[],
  numberedArtworks: readonly { id: string; inventoryNumber: string }[],
): { artworks: PackageArtwork[]; withoutNumber: number } {
  // An artwork being replaced gives up its number.
  const written = new Set(artworks.map(({ id }) => id));
  const taken = numberedArtworks
    .filter(({ id }) => !written.has(id))
    .map(({ inventoryNumber }) => inventoryNumber);
  let withoutNumber = 0;
  const result = artworks.map((artwork) => {
    const number = artwork.inventoryNumber;
    if (!number) return artwork;
    if (!taken.some((other) => isSameInventoryNumber(number, other))) {
      taken.push(number);
      return artwork;
    }
    withoutNumber++;
    return { ...artwork, inventoryNumber: null, needsReview: true };
  });
  return { artworks: result, withoutNumber };
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => !seen.has(id) && seen.add(id));
}
