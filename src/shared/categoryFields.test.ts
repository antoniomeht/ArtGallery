import { describe, expect, it } from "vitest";
import {
  hiddenFieldsFor,
  shownFields,
  withFieldShown,
  type HiddenFields,
} from "./categoryFields";
import { settingsSchema } from "./settings";

describe("fields shown for each category", () => {
  const hiddenFields: HiddenFields = { Fotografía: ["status", "support"] };

  it("has no rules until the user sets them", () => {
    expect(settingsSchema.parse({}).hiddenFields).toEqual({});
  });

  it("leaves out the fields set for the category", () => {
    expect([...hiddenFieldsFor("Fotografía", hiddenFields)].sort()).toEqual([
      "status",
      "support",
    ]);
  });

  it("matches the category ignoring accents, capitals and spaces", () => {
    expect(hiddenFieldsFor(" fotografia ", hiddenFields).has("status")).toBe(
      true,
    );
  });

  it("shows every field for other or missing categories", () => {
    expect(hiddenFieldsFor("Pintura", hiddenFields).size).toBe(0);
    expect(hiddenFieldsFor(null, hiddenFields).size).toBe(0);
  });

  it("changes one field of one category, keeping the others", () => {
    const rules = withFieldShown(hiddenFields, "Fotografía", "status", true);
    expect(hiddenFieldsFor("Fotografía", rules)).toEqual(new Set(["support"]));
    const more = withFieldShown(rules, "Dibujo", "price", false);
    expect(hiddenFieldsFor("Dibujo", more)).toEqual(new Set(["price"]));
  });
});

describe("an artwork as shown for its category", () => {
  it("blanks the hidden fields only", () => {
    const shown = shownFields(
      {
        technique: "Gelatina de plata",
        support: "Papel baritado",
        location: "Estudio",
        tags: ["costa"],
        price: 300,
        year: 1998,
      },
      new Set(["support", "tags", "price"]),
    );
    expect(shown).toEqual({
      technique: "Gelatina de plata",
      support: null,
      location: "Estudio",
      tags: [],
      price: null,
      year: 1998,
    });
  });
});
