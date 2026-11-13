import { describe, expect, it } from "vitest";
import { nextInventoryNumber, numberRangesSchema } from "./inventoryNumbers";

const ranges = numberRangesSchema.parse([
  { technique: "Óleo", from: 1, to: 199 },
  { technique: "Acuarela", from: 200, to: 399 },
]);

describe("the next inventory number of a technique", () => {
  it("is the first free number of its range, padded to three digits", () => {
    expect(nextInventoryNumber(ranges, "Óleo", [])).toBe("001");
    expect(nextInventoryNumber(ranges, "Óleo", ["001", "2", "004"])).toBe(
      "003",
    );
    expect(nextInventoryNumber(ranges, "acuarela", ["001"])).toBe("200");
  });

  it("matches the technique ignoring accents and capitals", () => {
    expect(nextInventoryNumber(ranges, " oleo ", [])).toBe("001");
  });

  it("pads to the digits of the range end when it is longer", () => {
    const big = numberRangesSchema.parse([
      { technique: "Grabado", from: 1, to: 1500 },
    ]);
    expect(nextInventoryNumber(big, "Grabado", [])).toBe("0001");
  });

  it("fills the first gap from 1 when the technique has no range", () => {
    const used = ["001", "2", "004", "5", "009", "A-7", null];
    expect(nextInventoryNumber(ranges, "Pastel", used)).toBe("003");
    expect(nextInventoryNumber(ranges, null, [...used, "003"])).toBe("006");
    expect(nextInventoryNumber([], null, [])).toBe("001");
  });

  it("has none when the range is full", () => {
    const tiny = numberRangesSchema.parse([
      { technique: "Óleo", from: 1, to: 2 },
    ]);
    expect(nextInventoryNumber(tiny, "Óleo", ["001", "002"])).toBeNull();
  });

  it("refuses a range that ends before it starts", () => {
    expect(() =>
      numberRangesSchema.parse([{ technique: "Óleo", from: 10, to: 5 }]),
    ).toThrow();
  });
});
