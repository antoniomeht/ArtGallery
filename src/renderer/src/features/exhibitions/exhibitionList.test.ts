import { describe, expect, it } from "vitest";
import type { ExhibitionSummary } from "../../../../shared/exhibition";
import { showExhibitions } from "./exhibitionList";

function exhibition(
  name: string,
  startDate: string | null,
  venue: string | null = null,
): ExhibitionSummary {
  return {
    id: name,
    name,
    venue,
    startDate,
    endDate: null,
    artworkCount: 0,
    coverImageId: null,
  };
}

const list = [
  exhibition("Mareas", "2025-03-01", "Casa de Cultura de Úbeda"),
  exhibition("Árboles", "2026-05-10", "Sala Municipal"),
  exhibition("Bodegones", null),
];
const names = (shown: ExhibitionSummary[]) => shown.map(({ name }) => name);

describe("the list of exhibitions", () => {
  it("shows the newest first, undated ones last", () => {
    expect(names(showExhibitions(list, "", "date-desc"))).toEqual([
      "Árboles",
      "Mareas",
      "Bodegones",
    ]);
  });

  it("can show the oldest first or by name", () => {
    expect(names(showExhibitions(list, "", "date-asc"))).toEqual([
      "Mareas",
      "Árboles",
      "Bodegones",
    ]);
    expect(names(showExhibitions(list, "", "name"))).toEqual([
      "Árboles",
      "Bodegones",
      "Mareas",
    ]);
  });

  it("finds by name or venue, ignoring accents and capitals", () => {
    expect(names(showExhibitions(list, "arbol", "date-desc"))).toEqual([
      "Árboles",
    ]);
    expect(names(showExhibitions(list, "UBEDA", "date-desc"))).toEqual([
      "Mareas",
    ]);
  });
});
