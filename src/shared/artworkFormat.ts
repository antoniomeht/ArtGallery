import type { Artwork, ArtworkStatus } from "./artwork";

const LOCALE = "es-ES";

export const STATUS_LABELS: Record<ArtworkStatus, string> = {
  available: "Disponible",
  exhibited: "Expuesta",
  loaned: "Prestada",
  sold: "Vendida",
  other: "Otro",
};

/** "Óleo sobre lienzo", or whichever of the two is known. */
export function formatMedium(
  artwork: Pick<Artwork, "technique" | "support">,
): string | null {
  return (
    [artwork.technique, artwork.support].filter(Boolean).join(" sobre ") || null
  );
}

export function formatYear(
  artwork: Pick<Artwork, "year" | "yearApproximate">,
): string | null {
  if (artwork.year == null) return null;
  return artwork.yearApproximate ? `c. ${artwork.year}` : String(artwork.year);
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
