import { describe, expect, it } from "vitest";
import { formatDimensions, formatPrice, formatYear } from "./artworkFormat";

describe("artwork label formatting", () => {
  it("writes dimensions as height × width × depth with the unit", () => {
    expect(
      formatDimensions({
        height: 65,
        width: 81.5,
        depth: null,
        dimensionUnit: "cm",
      }),
    ).toBe("65 × 81,5 cm");
    expect(
      formatDimensions({ height: 10, width: 8, depth: 2, dimensionUnit: "in" }),
    ).toBe("10 × 8 × 2 in");
  });

  it("omits dimensions that are incomplete", () => {
    expect(
      formatDimensions({
        height: 65,
        width: null,
        depth: null,
        dimensionUnit: "cm",
      }),
    ).toBeNull();
  });

  it("marks approximate years", () => {
    expect(formatYear({ year: 1890, yearApproximate: true })).toBe("c. 1890");
    expect(formatYear({ year: null, yearApproximate: true })).toBeNull();
  });

  it("formats prices in the artwork currency", () => {
    expect(
      formatPrice({ price: 1250.5, currency: "EUR" })?.replace(/\s/g, " "),
    ).toBe("1250,50 €");
  });
});
