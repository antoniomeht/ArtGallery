import { describe, expect, it } from "vitest";
import { fromSingleUnit } from "./dimensions";
import {
  LABEL_PRESETS,
  labelLayout,
  labelLines,
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

describe("the lines of a label", () => {
  const artwork = {
    title: "Marina",
    artist: "Lucía Ferrer",
    year: 1998,
    yearApproximate: false,
    technique: "Óleo",
    support: "lienzo",
    dimensions: fromSingleUnit({ height: 65, width: 81, depth: null }, "cm"),
    price: null,
    currency: "EUR",
  };

  it("follows the order chosen, one datum per line", () => {
    expect(labelLines(artwork, ["medium", "artist", "title"], "cm")).toEqual([
      { field: "medium", text: "Óleo sobre lienzo" },
      { field: "artist", text: "Lucía Ferrer" },
      { field: "title", text: "Marina" },
    ]);
  });

  it("joins the year to the title when it comes right after it", () => {
    expect(labelLines(artwork, ["title", "year"], "cm")).toEqual([
      { field: "title", text: "Marina", year: "1998" },
    ]);
    expect(labelLines(artwork, ["year", "title"], "cm")).toEqual([
      { field: "year", text: "1998" },
      { field: "title", text: "Marina" },
    ]);
  });

  it("leaves out data the artwork does not have", () => {
    expect(labelLines(artwork, ["price", "title"], "cm")).toEqual([
      { field: "title", text: "Marina" },
    ]);
  });
});

describe("label options", () => {
  it("keep the look of labels made before fonts and images existed", () => {
    expect(
      labelOptionsSchema.parse({
        fields: ["title"],
        widthMm: 90,
        heightMm: 50,
      }),
    ).toMatchObject({ showImage: false, font: "sans", textSize: "normal" });
  });

  it("refuse the same datum twice", () => {
    expect(
      labelOptionsSchema.safeParse({
        fields: ["title", "title"],
        widthMm: 90,
        heightMm: 50,
      }).success,
    ).toBe(false);
  });
});
