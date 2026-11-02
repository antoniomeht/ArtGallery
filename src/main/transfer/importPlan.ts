import type { Exhibition } from "../../shared/exhibition";
import type { DuplicatePolicy } from "../../shared/transfer";
import type {
  PackageArtwork,
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
}

/** Sorts the contents of a package before anything is written. */
export function planImport(
  {
    artworks,
    exhibitions,
  }: {
    artworks: readonly PackageArtwork[];
    exhibitions: readonly PackageExhibition[];
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
  added: number;
  replaced: number;
  skipped: number;
}

/**
 * Applies the user's choice for duplicates. The same choice covers artworks
 * and exhibitions, and exhibitions follow artworks that get a new id.
 */
export function resolveImport(
  plan: ImportPlan,
  policy: DuplicatePolicy,
  { newId, now }: { newId: () => string; now: Date },
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

  return {
    artworks: [...plan.fresh, ...duplicates],
    exhibitions,
    added: plan.fresh.length + (policy === "copy" ? duplicates.length : 0),
    replaced: policy === "replace" ? duplicates.length : 0,
    skipped: policy === "skip" ? plan.duplicates.length : 0,
  };
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => !seen.has(id) && seen.add(id));
}
