import { describe, expect, it } from "vitest";
import { artworkFieldsSchema, type Artwork } from "../../../../shared/artwork";
import { parseFormValues, toFormValues } from "./artworkFormValues";

const artwork: Artwork = {
  ...artworkFieldsSchema.parse({ title: "Marina" }),
  id: "a1",
  images: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

describe("artwork form values", () => {
  it("accepts decimal commas and comma-separated tags", () => {
    const result = parseFormValues({
      ...toFormValues(artwork),
      height: "65,5",
      width: "81",
      price: "1200,50",
      tags: "mar, puerto, , mar",
      currency: "usd",
    });

    expect(result).toMatchObject({
      ok: true,
      fields: {
        height: 65.5,
        width: 81,
        price: 1200.5,
        tags: ["mar", "puerto"],
        currency: "USD",
      },
    });
  });

  it("round-trips an existing record without changes", () => {
    const record = { ...artwork, height: 12.25, price: 99.9, tags: ["a"] };

    const result = parseFormValues(toFormValues(record));

    expect(result).toMatchObject({
      ok: true,
      fields: { height: 12.25, price: 99.9, tags: ["a"] },
    });
  });

  it("explains which fields are invalid", () => {
    const result = parseFormValues({
      ...toFormValues(artwork),
      title: " ",
      width: "ancho",
      year: "1998.5",
    });

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
