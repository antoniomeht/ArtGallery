import { INVENTORY_NUMBER_TAKEN } from "../../../../shared/inventoryNumbers";
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

const MEASURE_ERROR =
  "Introduce un número mayor que 0, con coma para los decimales (45,5).";

const ERROR_MESSAGES: ArtworkFormErrors = {
  title: "El título es obligatorio.",
  year: "Introduce un año, por ejemplo 1998.",
  height: MEASURE_ERROR,
  width: MEASURE_ERROR,
  depth: MEASURE_ERROR,
  price: "Introduce un importe, por ejemplo 1.200 o 1.200,50.",
  currency: "Usa un código de moneda de tres letras, por ejemplo EUR.",
};

const DEFAULT_ERROR = "Revisa este valor.";

/** The field to blame when saving failed, or null for any other failure. */
export function saveFailureErrors(error: unknown): ArtworkFormErrors | null {
  // IPC errors arrive wrapped in text.
  return String(error).includes(INVENTORY_NUMBER_TAKEN)
    ? {
        inventoryNumber:
          "Este número ya lo tiene otra obra (también cuentan las de la papelera).",
      }
    : null;
}

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

/** Whether saving `values` would change what `initial` showed. */
export function hasChanges(
  values: ArtworkFormValues,
  initial: ArtworkFormValues,
): boolean {
  // Saving trims every text, so spaces alone are not a change.
  const trimmed = (current: ArtworkFormValues) =>
    Object.values(current).map((value) =>
      typeof value === "string" ? value.trim() : value,
    );
  return JSON.stringify(trimmed(values)) !== JSON.stringify(trimmed(initial));
}

// Spanish numbers: a dot only groups thousands and a comma marks decimals,
// as in "1.500" or "12.345.678,5". "1.5" is refused rather than guessed.
const SPANISH_NUMBER = /^-?(\d+|[1-9]\d{0,2}(\.\d{3})+)(,\d+)?$/;

/** Blank means "no value"; accepts "1.500,5" and "1500,5". */
function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return SPANISH_NUMBER.test(trimmed)
    ? Number(trimmed.replace(/\./g, "").replace(",", "."))
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
