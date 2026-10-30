import {
  artworkFieldsSchema,
  type Artwork,
  type ArtworkFields,
  type ArtworkStatus,
  type DimensionUnit,
} from "../../../../shared/artwork";

/** Editable values as the form holds them: text inputs keep strings. */
export interface ArtworkFormValues {
  title: string;
  artist: string;
  category: string;
  technique: string;
  support: string;
  year: string;
  yearApproximate: boolean;
  height: string;
  width: string;
  depth: string;
  dimensionUnit: DimensionUnit;
  description: string;
  notes: string;
  tags: string;
  location: string;
  status: ArtworkStatus;
  price: string;
  currency: string;
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

export function toFormValues(artwork: Artwork): ArtworkFormValues {
  return {
    title: artwork.title,
    artist: artwork.artist ?? "",
    category: artwork.category ?? "",
    technique: artwork.technique ?? "",
    support: artwork.support ?? "",
    year: textOf(artwork.year),
    yearApproximate: artwork.yearApproximate,
    height: textOf(artwork.height),
    width: textOf(artwork.width),
    depth: textOf(artwork.depth),
    dimensionUnit: artwork.dimensionUnit,
    description: artwork.description ?? "",
    notes: artwork.notes ?? "",
    tags: artwork.tags.join(", "),
    location: artwork.location ?? "",
    status: artwork.status,
    price: textOf(artwork.price),
    currency: artwork.currency,
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

export function parseFormValues(
  values: ArtworkFormValues,
):
  | { ok: true; fields: ArtworkFields }
  | { ok: false; errors: ArtworkFormErrors } {
  const result = artworkFieldsSchema.safeParse({
    ...values,
    year: parseNumber(values.year),
    height: parseNumber(values.height),
    width: parseNumber(values.width),
    depth: parseNumber(values.depth),
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
    const field = issue.path[0] as keyof ArtworkFormValues;
    errors[field] ??= ERROR_MESSAGES[field] ?? DEFAULT_ERROR;
  }
  return { ok: false, errors };
}
