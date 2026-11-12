import { describe, expect, it } from "vitest";
import { artworkFieldsSchema, type Artwork } from "../../../../shared/artwork";
import { fromSingleUnit } from "../../../../shared/dimensions";
import { parseFormValues, toFormValues } from "./artworkFormValues";

const artwork: Artwork = {
  ...artworkFieldsSchema.parse({ title: "Marina" }),
  id: "a1",
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  needsReview: false,
  favorite: false,
};

describe("artwork form values", () => {
  it("accepts decimal commas and comma-separated tags", () => {
    const result = parseFormValues(
      {
        ...toFormValues(artwork, "cm"),
        height: "65,5",
        width: "81",
        price: "1200,50",
        tags: "mar, puerto, , mar",
        currency: "usd",
      },
      "cm",
      artwork.dimensions,
    );

    expect(result).toMatchObject({
      ok: true,
      fields: {
        dimensions: { cm: { height: 65.5, width: 81, depth: null } },
        price: 1200.5,
        tags: ["mar", "puerto"],
        currency: "USD",
      },
    });
  });

  it("round-trips an existing record without changes", () => {
    const record: Artwork = {
      ...artwork,
      dimensions: fromSingleUnit({ height: 46, width: 55, depth: null }, "cm"),
      price: 99.9,
      tags: ["a"],
    };

    // Shown in inches as 18,1 × 21,7: saving keeps the exact stored values.
    const result = parseFormValues(
      toFormValues(record, "in"),
      "in",
      record.dimensions,
    );

    expect(result).toMatchObject({
      ok: true,
      fields: { dimensions: record.dimensions, price: 99.9, tags: ["a"] },
    });
  });

  it("keeps the review mark", () => {
    const record: Artwork = { ...artwork, needsReview: true };

    const result = parseFormValues(
      toFormValues(record, "cm"),
      "cm",
      record.dimensions,
    );

    expect(result).toMatchObject({ ok: true, fields: { needsReview: true } });
  });

  it("explains which fields are invalid", () => {
    const result = parseFormValues(
      {
        ...toFormValues(artwork, "cm"),
        title: " ",
        width: "ancho",
        year: "1998.5",
      },
      "cm",
      artwork.dimensions,
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        title: "El título es obligatorio.",
        width: "Introduce un número mayor que 0.",
        year: "Introduce un año, por ejemplo 1998.",
      },
    });
  });
});
