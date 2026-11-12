import {
  artworkFieldsSchema,
  type Artwork,
  type ArtworkFields,
  type ArtworkStatus,
} from "../../../../shared/artwork";
import {
  roundMeasure,
  withEnteredMeasures,
  type Dimensions,
  type DimensionUnit,
  type Measures,
} from "../../../../shared/dimensions";

/**
 * Editable values as the form holds them: text inputs keep strings, and
 * measures are in the unit chosen in the settings.
 */
export interface ArtworkFormValues {
  title: string;
  inventoryNumber: string;
  artist: string;
  category: string;
  technique: string;
  support: string;
  year: string;
  yearApproximate: boolean;
  height: string;
  width: string;
  depth: string;
  description: string;
  notes: string;
  tags: string;
  location: string;
  status: ArtworkStatus;
  price: string;
  currency: string;
  needsReview: boolean;
}

export type ArtworkFormErrors = Partial<
  Record<keyof ArtworkFormValues, string>
>;

const ERROR_MESSAGES: ArtworkFormErrors = {
  title: "El título es obligatorio.",
  year: "Introduce un año, por ejemplo 1998.",
  height: "Introduce un número mayor que 0.",
  width: "Introduce un número mayor que 0.",
  depth: "Introduce un número mayor que 0.",
  price: "Introduce un importe, por ejemplo 1200 o 1200,50.",
  currency: "Usa un código de moneda de tres letras, por ejemplo EUR.",
};

const DEFAULT_ERROR = "Revisa este valor.";

const textOf = (value: string | number | null) =>
  value == null ? "" : String(value).replace(".", ",");

const measureText = (value: number | null) =>
  textOf(value == null ? null : roundMeasure(value));

export function toFormValues(
  artwork: Artwork,
  unit: DimensionUnit,
): ArtworkFormValues {
  const measures = artwork.dimensions[unit];
  return {
    title: artwork.title,
    inventoryNumber: artwork.inventoryNumber ?? "",
    artist: artwork.artist ?? "",
    category: artwork.category ?? "",
    technique: artwork.technique ?? "",
    support: artwork.support ?? "",
    year: textOf(artwork.year),
    yearApproximate: artwork.yearApproximate,
    height: measureText(measures.height),
    width: measureText(measures.width),
    depth: measureText(measures.depth),
    description: artwork.description ?? "",
    notes: artwork.notes ?? "",
    tags: artwork.tags.join(", "),
    location: artwork.location ?? "",
    status: artwork.status,
    price: textOf(artwork.price),
    currency: artwork.currency,
    needsReview: artwork.needsReview,
  };
}

/** Blank means "no value"; accepts both "12,5" and "12.5". */
function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return /^-?\d+([.,]\d+)?$/.test(trimmed)
    ? Number(trimmed.replace(",", "."))
    : Number.NaN;
}

/** The measures typed in the form, in the settings unit. */
export function enteredMeasures(values: ArtworkFormValues): Measures {
  return {
    height: parseNumber(values.height),
    width: parseNumber(values.width),
    depth: parseNumber(values.depth),
  };
}

/** `previous` keeps measures left as shown from drifting on save. */
export function parseFormValues(
  values: ArtworkFormValues,
  unit: DimensionUnit,
  previous: Dimensions,
):
  | { ok: true; fields: ArtworkFields }
  | { ok: false; errors: ArtworkFormErrors } {
  // Unknown keys, such as the measure texts, are dropped by the schema.
  const result = artworkFieldsSchema.safeParse({
    ...values,
    year: parseNumber(values.year),
    dimensions: withEnteredMeasures(previous, unit, enteredMeasures(values)),
    price: parseNumber(values.price),
    currency: values.currency.trim().toUpperCase(),
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  });
  if (result.success) return { ok: true, fields: result.data };

  const errors: ArtworkFormErrors = {};
  for (const issue of result.error.issues) {
    // Measures are checked in both units; the error goes on the input.
    const [first, , axis] = issue.path;
    const field = (
      first === "dimensions" ? axis : first
    ) as keyof ArtworkFormValues;
    errors[field] ??= ERROR_MESSAGES[field] ?? DEFAULT_ERROR;
  }
  return { ok: false, errors };
}
