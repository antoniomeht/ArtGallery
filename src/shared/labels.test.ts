import { describe, expect, it } from "vitest";
import { fromSingleUnit } from "./dimensions";
import {
  addElement,
  defaultLabelTemplate,
  LABEL_PRESETS,
  labelLayout,
  labelTemplateSchema,
  labelTexts,
  paginate,
  removeElements,
  resizeTemplate,
  type LabelTemplate,
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

  it("splits labels into sheets", () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginate([], 10)).toEqual([]);
  });
});

describe("the texts of a label", () => {
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

  it("gives each datum its own text, null when the artwork lacks it", () => {
    expect(labelTexts(artwork, "cm")).toEqual({
      artist: "Lucía Ferrer",
      title: "Marina",
      year: "1998",
      medium: "Óleo sobre lienzo",
      dimensions: "65 × 81 cm",
      price: null,
    });
  });
});

const small = { widthMm: 90, heightMm: 50 };
const kindsOf = (template: LabelTemplate) =>
  template.elements.map(({ kind }) => kind);

describe("the default label template", () => {
  it("stacks the usual data inside the margins, artist in bold", () => {
    const template = defaultLabelTemplate(small);

    expect(kindsOf(template)).toEqual([
      "artist",
      "title",
      "year",
      "medium",
      "dimensions",
    ]);
    expect(template.marginMm).toBe(5);
    expect(template.elements[0]).toMatchObject({ bold: true });
    expect(template.elements[1]).toMatchObject({ italic: true });
    for (const element of template.elements) {
      expect(element.xMm).toBe(5);
      expect(element.widthMm).toBe(80);
      expect(element.yMm).toBeGreaterThanOrEqual(5);
    }
    const ys = template.elements.map(({ yMm }) => yMm);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(labelTemplateSchema.safeParse(template).success).toBe(true);
  });

  it("puts the image on the left and the text beside it", () => {
    const template = defaultLabelTemplate(small, ["image", "title"]);
    const [image, title] = template.elements;

    expect(image).toMatchObject({
      kind: "image",
      xMm: 5,
      yMm: 5,
      heightMm: 40,
    });
    expect(title?.xMm).toBeGreaterThan(
      (image?.xMm ?? 0) + (image?.widthMm ?? 0),
    );
    expect((title?.xMm ?? 0) + (title?.widthMm ?? 0)).toBeCloseTo(85);
  });

  it("uses bigger type on bigger labels", () => {
    const large = defaultLabelTemplate({ widthMm: 150, heightMm: 100 });

    expect(large.elements[0]?.fontSizePt).toBeGreaterThan(
      defaultLabelTemplate(small).elements[0]?.fontSizePt ?? 0,
    );
  });
});

describe("editing the template", () => {
  it("adds a datum below the others, once", () => {
    const template = defaultLabelTemplate(small, ["artist", "title"]);
    const added = addElement(template, "price");
    const price = added.elements.at(-1);

    expect(kindsOf(added)).toEqual(["artist", "title", "price"]);
    expect(price?.xMm).toBe(5);
    expect(price?.yMm).toBeGreaterThan(template.elements[1]?.yMm ?? 0);
    expect(addElement(added, "price")).toBe(added);
  });

  it("starts again at the top margin when there is no room below", () => {
    const full = defaultLabelTemplate(small, [
      "artist",
      "title",
      "year",
      "medium",
      "dimensions",
    ]);
    const crowded: LabelTemplate = {
      ...full,
      elements: full.elements.map((element) => ({ ...element, yMm: 40 })),
    };

    expect(addElement(crowded, "price").elements.at(-1)?.yMm).toBe(5);
  });

  it("removes the chosen boxes", () => {
    const template = defaultLabelTemplate(small);

    expect(kindsOf(removeElements(template, ["title", "year"]))).toEqual([
      "artist",
      "medium",
      "dimensions",
    ]);
  });

  it("scales the boxes with the label size", () => {
    const template = defaultLabelTemplate(small, ["image", "title"]);
    const resized = resizeTemplate(template, { widthMm: 180, heightMm: 100 });

    expect(resized).toMatchObject({ widthMm: 180, heightMm: 100 });
    expect(resized.elements[0]).toMatchObject({
      xMm: 10,
      yMm: 10,
      heightMm: 80,
    });
    expect(resized.elements[1]?.fontSizePt).toBe(
      (template.elements[1]?.fontSizePt ?? 0) * 2,
    );
  });
});

describe("label template validation", () => {
  const valid = defaultLabelTemplate(small);

  it("rejects sizes that do not fit or are too small to read", () => {
    for (const size of [
      { widthMm: 200, heightMm: 50 },
      { widthMm: 30, heightMm: 50 },
    ]) {
      expect(labelTemplateSchema.safeParse({ ...valid, ...size }).success).toBe(
        false,
      );
    }
  });

  it("needs at least one box and each datum once", () => {
    expect(
      labelTemplateSchema.safeParse({ ...valid, elements: [] }).success,
    ).toBe(false);
    expect(
      labelTemplateSchema.safeParse({
        ...valid,
        elements: [valid.elements[0], valid.elements[0]],
      }).success,
    ).toBe(false);
  });
});
