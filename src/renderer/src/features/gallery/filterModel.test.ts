import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filterBubbles,
  hasActiveFilters,
  toArtworkQuery,
} from "./filterModel";

describe("gallery filters", () => {
  it("leaves blank fields out of the query", () => {
    expect(toArtworkQuery({ ...EMPTY_FILTERS, text: "  " })).toEqual({
      text: undefined,
      statuses: undefined,
      categories: undefined,
      artists: undefined,
      techniques: undefined,
      tags: undefined,
      locations: undefined,
      collections: undefined,
      yearFrom: undefined,
      yearTo: undefined,
    });
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("ignores years that are not whole numbers", () => {
    const filters = { ...EMPTY_FILTERS, yearFrom: "1990", yearTo: "dos mil" };

    expect(toArtworkQuery(filters)).toMatchObject({
      yearFrom: 1990,
      yearTo: undefined,
    });
    expect(hasActiveFilters({ ...EMPTY_FILTERS, yearTo: "dos mil" })).toBe(
      false,
    );
  });

  it("makes one bubble per chosen value, and removing it keeps the rest", () => {
    const filters = {
      ...EMPTY_FILTERS,
      statuses: ["sold" as const],
      techniques: ["Óleo", "Acrílico"],
      text: "mar",
    };

    const bubbles = filterBubbles(filters);

    expect(bubbles.map(({ label }) => label)).toEqual([
      "Vendida",
      "Óleo",
      "Acrílico",
    ]);
    expect(bubbles[1]?.without).toEqual({
      ...filters,
      techniques: ["Acrílico"],
    });
  });

  it("joins the year range in a single bubble", () => {
    const [bubble, ...others] = filterBubbles({
      ...EMPTY_FILTERS,
      yearFrom: "2015",
    });

    expect(others).toEqual([]);
    expect(bubble?.label).toBe("2015–…");
    expect(bubble?.without).toEqual(EMPTY_FILTERS);
    expect(filterBubbles({ ...EMPTY_FILTERS, yearTo: "abc" })).toEqual([]);
  });

  it("filters by collection ids and names their bubbles", () => {
    const filters = { ...EMPTY_FILTERS, collections: ["c1", "c2"] };
    const names = new Map([["c1", "Serie del puerto"]]);

    expect(toArtworkQuery(filters).collections).toEqual(["c1", "c2"]);
    const bubbles = filterBubbles(filters, names);
    expect(
      bubbles.map(({ filterLabel, label }) => [filterLabel, label]),
    ).toEqual([["Colección", "Serie del puerto"]]);
    expect(bubbles[0]?.without.collections).toEqual(["c2"]);
  });
});
