import { describe, expect, it } from "vitest";
import {
  applySuggestion,
  currentTerm,
  otherListValues,
  rankSuggestions,
} from "./suggestions";

describe("field suggestions", () => {
  const VALUES = ["Acuarela sobre óleo", "Collage y tinta", "Óleo", "Tinta"];

  it("puts the closest value first, ignoring accents and case", () => {
    expect(rankSuggestions("OLEO", VALUES)).toEqual([
      "Óleo",
      "Acuarela sobre óleo",
    ]);
    expect(rankSuggestions("tin", VALUES)).toEqual([
      "Tinta",
      "Collage y tinta",
    ]);
    expect(rankSuggestions("nta", VALUES)).toEqual([
      "Collage y tinta",
      "Tinta",
    ]);
  });

  it("offers everything for an empty term and nothing without a match", () => {
    expect(rankSuggestions("  ", VALUES)).toEqual(VALUES);
    expect(rankSuggestions("bronce", VALUES)).toEqual([]);
  });

  it("works on the last part of a comma-separated list", () => {
    expect(currentTerm("mar, luz, pai", true)).toBe(" pai");
    expect(currentTerm("mar, luz", false)).toBe("mar, luz");
    expect(otherListValues("mar, luz, pai")).toEqual(["mar", "luz"]);
    expect(applySuggestion("mar, pai", "paisaje", true)).toBe("mar, paisaje, ");
    expect(applySuggestion("Ole", "Óleo", false)).toBe("Óleo");
  });
});
