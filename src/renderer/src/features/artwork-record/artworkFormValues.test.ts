import { describe, expect, it } from "vitest";
import { artworkFieldsSchema, type Artwork } from "../../../../shared/artwork";
import { fromSingleUnit } from "../../../../shared/dimensions";
import {
  hasChanges,
  parseFormValues,
  saveFailureErrors,
  toFormValues,
} from "./artworkFormValues";

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

  it.each([
    ["1.500", 1500],
    ["12.345.678", 12345678],
    ["1.500,50", 1500.5],
    ["1500,5", 1500.5],
    ["1,500", 1.5],
  ])("reads the price %s as %d", (price, expected) => {
    const result = parseFormValues(
      { ...toFormValues(artwork, "cm"), price },
      "cm",
      artwork.dimensions,
    );

    expect(result).toMatchObject({ ok: true, fields: { price: expected } });
  });

  it("reads thousands in measures too", () => {
    const result = parseFormValues(
      { ...toFormValues(artwork, "cm"), width: "1.250", height: "1.250,5" },
      "cm",
      artwork.dimensions,
    );

    expect(result).toMatchObject({
      ok: true,
      fields: { dimensions: { cm: { width: 1250, height: 1250.5 } } },
    });
  });

  it.each(["1.5", "1.25", "0.500", "1500.5", "1.500.5", "1,500.5", "1.50,5"])(
    "rejects a dot that does not group thousands, as in %s",
    (price) => {
      const result = parseFormValues(
        { ...toFormValues(artwork, "cm"), price },
        "cm",
        artwork.dimensions,
      );

      expect(result).toMatchObject({
        ok: false,
        errors: { price: expect.any(String) },
      });
    },
  );

  it("round-trips a price with thousands and decimals", () => {
    const record: Artwork = { ...artwork, price: 1500.5 };

    const result = parseFormValues(
      toFormValues(record, "cm"),
      "cm",
      record.dimensions,
    );

    expect(result).toMatchObject({ ok: true, fields: { price: 1500.5 } });
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
        width:
          "Introduce un número mayor que 0, con coma para los decimales (45,5).",
        year: "Introduce un año, por ejemplo 1998.",
      },
    });
  });

  describe("hasChanges", () => {
    const shown = toFormValues(artwork, "cm");

    it("sees no change in a record just opened", () => {
      expect(hasChanges(toFormValues(artwork, "cm"), shown)).toBe(false);
    });

    it("ignores spaces that saving trims", () => {
      expect(
        hasChanges({ ...shown, title: " Marina ", notes: "\n" }, shown),
      ).toBe(false);
    });

    it("sees typed text and ticked boxes", () => {
      expect(hasChanges({ ...shown, title: "Marina II" }, shown)).toBe(true);
      expect(hasChanges({ ...shown, needsReview: true }, shown)).toBe(true);
    });
  });

  it("points at the inventory number when another artwork has it", () => {
    const ipcError = new Error(
      "Error invoking remote method 'artworks:update': Error: Inventory number taken",
    );
    expect(saveFailureErrors(ipcError)).toEqual({
      inventoryNumber: expect.stringContaining("ya lo tiene otra obra"),
    });
    expect(saveFailureErrors(new Error("disk full"))).toBeNull();
  });
});
