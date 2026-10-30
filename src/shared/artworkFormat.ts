import type { Artwork, ArtworkStatus } from "./artwork";

const LOCALE = "es-ES";

export const STATUS_LABELS: Record<ArtworkStatus, string> = {
  available: "Disponible",
  exhibited: "Expuesta",
  loaned: "Prestada",
  sold: "Vendida",
  other: "Otro",
};

export function formatYear(
  artwork: Pick<Artwork, "year" | "yearApproximate">,
): string | null {
  if (artwork.year == null) return null;
  return artwork.yearApproximate ? `c. ${artwork.year}` : String(artwork.year);
}

/** "65 × 81 cm" or "65 × 81 × 4 cm"; null when height or width is missing. */
export function formatDimensions(
  artwork: Pick<Artwork, "height" | "width" | "depth" | "dimensionUnit">,
): string | null {
  const { height, width, depth, dimensionUnit } = artwork;
  if (height == null || width == null) return null;
  const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
  const parts = [height, width, depth].filter((value) => value != null);
  return `${parts.map((value) => number.format(value)).join(" × ")} ${dimensionUnit}`;
}

export function formatPrice(
  artwork: Pick<Artwork, "price" | "currency">,
): string | null {
  if (artwork.price == null) return null;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: artwork.currency,
  }).format(artwork.price);
}
