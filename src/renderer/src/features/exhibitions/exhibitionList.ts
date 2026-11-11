import type { ExhibitionSummary } from "../../../../shared/exhibition";
import { foldText } from "../../../../shared/text";

export const EXHIBITION_SORTS = ["date-desc", "date-asc", "name"] as const;
export type ExhibitionSort = (typeof EXHIBITION_SORTS)[number];

export const EXHIBITION_SORT_LABELS: Record<ExhibitionSort, string> = {
  "date-desc": "Fecha (más recientes primero)",
  "date-asc": "Fecha (más antiguas primero)",
  name: "Nombre (A–Z)",
};

const byName = (a: ExhibitionSummary, b: ExhibitionSummary) =>
  foldText(a.name).localeCompare(foldText(b.name), "es");

/** Dated exhibitions in the chosen direction, undated ones after them. */
function byDate(direction: 1 | -1) {
  return (a: ExhibitionSummary, b: ExhibitionSummary) => {
    if (a.startDate === b.startDate) return byName(a, b);
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return direction * a.startDate.localeCompare(b.startDate);
  };
}

const COMPARE: Record<
  ExhibitionSort,
  (a: ExhibitionSummary, b: ExhibitionSummary) => number
> = {
  "date-desc": byDate(-1),
  "date-asc": byDate(1),
  name: byName,
};

/** The exhibitions whose name or venue contain `query`, in `sort` order. */
export function showExhibitions(
  exhibitions: readonly ExhibitionSummary[],
  query: string,
  sort: ExhibitionSort,
): ExhibitionSummary[] {
  const term = foldText(query);
  return exhibitions
    .filter(({ name, venue }) =>
      [name, venue ?? ""].some((text) => foldText(text).includes(term)),
    )
    .sort(COMPARE[sort]);
}
