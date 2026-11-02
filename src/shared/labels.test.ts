import { describe, expect, it } from "vitest";
import {
  LABEL_PRESETS,
  labelLayout,
  labelOptionsSchema,
  paginate,
} from "./labels";

describe("label layout on A4", () => {
  it("fits the presets in a regular grid inside the margins", () => {
    const [small, medium, large] = LABEL_PRESETS.map(labelLayout);

    expect(small).toEqual({ columns: 2, rows: 5, perSheet: 10 });
    expect(medium).toEqual({ columns: 1, rows: 3, perSheet: 3 });
    expect(large).toEqual({ columns: 1, rows: 2, perSheet: 2 });
  });

  it("uses the full printable area for a label exactly that size", () => {
    expect(labelLayout({ widthMm: 190, heightMm: 277 })).toEqual({
      columns: 1,
      rows: 1,
      perSheet: 1,
    });
    expect(labelLayout({ widthMm: 93, heightMm: 136.5 })).toMatchObject({
      columns: 2,
      rows: 2,
    });
  });

  it("rejects sizes that do not fit or are too small to read", () => {
    expect(
      labelOptionsSchema.safeParse({
        fields: ["title"],
        widthMm: 200,
        heightMm: 50,
      }).success,
    ).toBe(false);
    expect(
      labelOptionsSchema.safeParse({
        fields: ["title"],
        widthMm: 30,
        heightMm: 50,
      }).success,
    ).toBe(false);
    expect(
      labelOptionsSchema.safeParse({ fields: [], widthMm: 90, heightMm: 50 })
        .success,
    ).toBe(false);
  });

  it("splits labels into sheets", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginate([], 10)).toEqual([]);
  });
});
