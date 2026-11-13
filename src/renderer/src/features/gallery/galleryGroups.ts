import type { ArtworkSort, ArtworkSummary } from "../../../../shared/artwork";
import { foldText } from "../../../../shared/text";

export const countLabel = (count: number) =>
  count === 1 ? "1 obra" : `${count} obras`;

export interface GalleryGroup {
  key: string;
  label: string;
  artworks: ArtworkSummary[];
}

type Grouping = (artwork: ArtworkSummary) => { key: string; label: string };

const byYear: Grouping = ({ year }) =>
  year === null
    ? { key: "none", label: "Sin año" }
    : { key: String(year), label: String(year) };

const byTechnique: Grouping = ({ technique }) => {
  const key = technique ? foldText(technique) : "";
  return key
    ? { key, label: technique!.trim() }
    : { key: "none", label: "Sin técnica" };
};

const GROUPINGS: Partial<Record<ArtworkSort, Grouping>> = {
  "year-desc": byYear,
  "year-asc": byYear,
  technique: byTechnique,
};

/**
 * The gallery's divisions for `sort`, in the order their first artwork comes
 * and keeping the artworks' order within each; null when it has none.
 */
export function galleryGroups(
  artworks: readonly ArtworkSummary[],
  sort: ArtworkSort,
): GalleryGroup[] | null {
  const grouping = GROUPINGS[sort];
  if (!grouping) return null;
  const groups = new Map<string, GalleryGroup>();
  for (const artwork of artworks) {
    const { key, label } = grouping(artwork);
    const group = groups.get(key);
    if (group) group.artworks.push(artwork);
    else groups.set(key, { key, label, artworks: [artwork] });
  }
  return [...groups.values()];
}
