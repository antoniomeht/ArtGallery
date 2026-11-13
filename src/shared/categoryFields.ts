import { z } from "zod";
import { foldText } from "./text";

/** Fields of the artwork form that a category may leave out. */
export const OPTIONAL_FIELDS = [
  "inventoryNumber",
  "status",
  "technique",
  "support",
  "year",
  "dimensions",
  "location",
  "tags",
  "price",
  "description",
  "notes",
] as const;
export type OptionalField = (typeof OPTIONAL_FIELDS)[number];

export const OPTIONAL_FIELD_LABELS: Record<OptionalField, string> = {
  inventoryNumber: "Nº de inventario",
  status: "Estado",
  technique: "Técnica",
  support: "Soporte",
  year: "Año",
  dimensions: "Dimensiones",
  location: "Ubicación",
  tags: "Etiquetas",
  price: "Precio",
  description: "Descripción",
  notes: "Notas",
};

/** Hidden fields by category name, as the user wrote the category. */
export const hiddenFieldsSchema = z
  .record(z.string().trim().min(1).max(100), z.array(z.enum(OPTIONAL_FIELDS)))
  .default({});

export type HiddenFields = z.output<typeof hiddenFieldsSchema>;

function ruleKey(rules: HiddenFields, category: string): string | undefined {
  const folded = foldText(category);
  return Object.keys(rules).find((key) => foldText(key) === folded);
}

/** The fields to leave out for an artwork of `category`. */
export function hiddenFieldsFor(
  category: string | null,
  rules: HiddenFields,
): Set<OptionalField> {
  const key = category ? ruleKey(rules, category) : undefined;
  return new Set(key ? rules[key] : []);
}

/** `rules` with `field` shown or hidden for `category`. */
export function withFieldShown(
  rules: HiddenFields,
  category: string,
  field: OptionalField,
  shown: boolean,
): HiddenFields {
  const key = ruleKey(rules, category) ?? category.trim();
  const hidden = new Set(rules[key] ?? []);
  if (shown) hidden.delete(field);
  else hidden.add(field);
  const others = Object.fromEntries(
    Object.entries(rules).filter(([name]) => name !== key),
  );
  return hidden.size > 0
    ? { ...others, [key]: OPTIONAL_FIELDS.filter((f) => hidden.has(f)) }
    : others;
}

/** Fields held as one nullable value, blanked when hidden. */
const NULLABLE_FIELDS = [
  "inventoryNumber",
  "technique",
  "support",
  "year",
  "location",
  "price",
  "description",
  "notes",
] as const;

type Shown = Partial<
  Record<(typeof NULLABLE_FIELDS)[number], unknown> & { tags: string[] }
>;

/**
 * The artwork as its category shows it: hidden values are blanked, never
 * deleted. Status and dimensions are left to the caller.
 */
export function shownFields<T extends Shown>(
  artwork: T,
  hidden: ReadonlySet<OptionalField>,
): T {
  const shown: Shown = { ...artwork };
  for (const field of NULLABLE_FIELDS) {
    if (hidden.has(field) && field in shown) shown[field] = null;
  }
  if (hidden.has("tags") && shown.tags) shown.tags = [];
  return shown as T;
}
