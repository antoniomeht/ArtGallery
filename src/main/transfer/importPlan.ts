import type { DuplicatePolicy } from "../../shared/transfer";
import type { PackageArtwork } from "../package/packageFormat";

export interface ImportPlan {
  fresh: PackageArtwork[];
  /** Artworks whose id already exists in the inventory. */
  duplicates: PackageArtwork[];
  /** Artworks that were in the trash where the package was made. */
  trashedSkipped: number;
}

/** Sorts the artworks of a package before anything is written. */
export function planImport(
  artworks: readonly PackageArtwork[],
  existingIds: ReadonlySet<string>,
): ImportPlan {
  const plan: ImportPlan = { fresh: [], duplicates: [], trashedSkipped: 0 };
  const seen = new Set<string>();
  for (const artwork of artworks) {
    if (seen.has(artwork.id)) continue;
    seen.add(artwork.id);
    if (artwork.deletedAt) plan.trashedSkipped++;
    else if (existingIds.has(artwork.id)) plan.duplicates.push(artwork);
    else plan.fresh.push(artwork);
  }
  return plan;
}

export interface ResolvedImport {
  /** Artworks to write; any with an existing id replaces it. */
  artworks: PackageArtwork[];
  added: number;
  replaced: number;
  skipped: number;
}

/** Applies the user's choice for duplicates to an import plan. */
export function resolveImport(
  plan: ImportPlan,
  policy: DuplicatePolicy,
  { newId, now }: { newId: () => string; now: Date },
): ResolvedImport {
  const { fresh, duplicates } = plan;
  switch (policy) {
    case "skip":
      return {
        artworks: fresh,
        added: fresh.length,
        replaced: 0,
        skipped: duplicates.length,
      };
    case "replace":
      return {
        artworks: [...fresh, ...duplicates],
        added: fresh.length,
        replaced: duplicates.length,
        skipped: 0,
      };
    case "copy": {
      const timestamp = now.toISOString();
      const copies = duplicates.map((artwork) => ({
        ...artwork,
        id: newId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
      return {
        artworks: [...fresh, ...copies],
        added: fresh.length + copies.length,
        replaced: 0,
        skipped: 0,
      };
    }
  }
}
