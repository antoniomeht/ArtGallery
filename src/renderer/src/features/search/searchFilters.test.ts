import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  toArtworkQuery,
} from "./searchFilters";

describe("search filters", () => {
  it("leaves blank fields out of the query", () => {
    expect(toArtworkQuery({ ...EMPTY_FILTERS, text: "  " })).toEqual({
      text: undefined,
      statuses: undefined,
      category: undefined,
      artist: undefined,
      technique: undefined,
      tag: undefined,
      location: undefined,
      yearFrom: undefined,
      yearTo: undefined,
    });
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("ignores years that are not whole numbers", () => {
    const query = toArtworkQuery({
      ...EMPTY_FILTERS,
      yearFrom: "1990",
      yearTo: "dos mil",
    });

    expect(query).toMatchObject({ yearFrom: 1990, yearTo: undefined });
    expect(hasActiveFilters({ ...EMPTY_FILTERS, yearTo: "dos mil" })).toBe(
      false,
    );
  });

  it("keeps the chosen statuses and values", () => {
    expect(
      toArtworkQuery({
        ...EMPTY_FILTERS,
        statuses: ["sold"],
        tag: "puerto",
      }),
    ).toMatchObject({ statuses: ["sold"], tag: "puerto" });
  });
});
