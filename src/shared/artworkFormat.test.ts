import { describe, expect, it } from "vitest";
import { formatPrice, formatYear } from "./artworkFormat";

describe("artwork label formatting", () => {
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
