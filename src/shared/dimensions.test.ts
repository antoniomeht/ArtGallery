import { describe, expect, it } from "vitest";
import {
  EMPTY_DIMENSIONS,
  formatDimensions,
  fromSingleUnit,
  withEnteredMeasures,
  type Dimensions,
} from "./dimensions";

const painting: Dimensions = fromSingleUnit(
  { height: 46, width: 55, depth: null },
  "cm",
);

describe("dimensions", () => {
  it("keeps the entered unit as typed and converts the other one", () => {
    expect(painting.cm).toEqual({ height: 46, width: 55, depth: null });
    expect(painting.in.height).toBeCloseTo(18.1102, 4);
    expect(painting.in.width).toBeCloseTo(21.6535, 4);
    expect(painting.in.depth).toBeNull();
    expect(fromSingleUnit({ height: 10, width: 8, depth: 1 }, "in").cm).toEqual(
      { height: 25.4, width: 20.32, depth: 2.54 },
    );
  });

  it("formats in the chosen unit with at most one decimal", () => {
    expect(formatDimensions(painting, "cm")).toBe("46 × 55 cm");
    expect(formatDimensions(painting, "in")).toBe("18,1 × 21,7 in");
    expect(formatDimensions(EMPTY_DIMENSIONS, "cm")).toBeNull();
  });

  it("does not recalculate measures left as shown", () => {
    // 18,1 is how 18.1102… in is shown; keeping it must not turn 46 cm into 45.97.
    const saved = withEnteredMeasures(painting, "in", {
      height: 18.1,
      width: 30,
      depth: null,
    });

    expect(saved.cm.height).toBe(46);
    expect(saved.in.height).toBe(painting.in.height);
    expect(saved.in.width).toBe(30);
    expect(saved.cm.width).toBeCloseTo(76.2, 6);
  });

  it("clears both units when a measure is emptied", () => {
    const saved = withEnteredMeasures(painting, "cm", {
      height: 46,
      width: null,
      depth: null,
    });

    expect(saved.cm.width).toBeNull();
    expect(saved.in.width).toBeNull();
  });
});
