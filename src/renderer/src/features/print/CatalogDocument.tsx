import type { Artwork } from "../../../../shared/artwork";
import {
  formatDimensions,
  formatMedium,
  formatPrice,
  formatYear,
} from "../../../../shared/artworkFormat";
import type { ExhibitionDetail } from "../../../../shared/exhibition";
import { formatDateRange } from "../../../../shared/exhibitionFormat";
import { originalUrl, thumbnailUrl } from "../../../../shared/media";

interface CatalogDocumentProps {
  exhibition: ExhibitionDetail;
  artworks: Artwork[];
  includePrices: boolean;
}

/** Exhibition catalogue: a cover page, then every artwork in order. */
export function CatalogDocument({
  exhibition,
  artworks,
  includePrices,
}: CatalogDocumentProps) {
  const cover = artworks.find((artwork) => artwork.images.length > 0);
  const dates = formatDateRange(exhibition);

  return (
    <article className="catalog">
      <section className="catalog-cover">
        {cover && (
          <img
            className="catalog-cover__image"
            src={originalUrl(cover.images[0]!.fileName)}
            alt=""
          />
        )}
        <h1 className="catalog-cover__title">{exhibition.name}</h1>
        {(exhibition.venue || dates) && (
          <p className="catalog-cover__meta">
            {[exhibition.venue, dates].filter(Boolean).join(". ")}
          </p>
        )}
        {exhibition.description && (
          <p className="catalog-cover__description">{exhibition.description}</p>
        )}
      </section>

      <section className="catalog-list">
        <h2 className="catalog-list__title">
          {artworks.length === 1 ? "1 obra" : `${artworks.length} obras`}
        </h2>
        {artworks.map((artwork, index) => (
          <CatalogEntry
            key={artwork.id}
            number={index + 1}
            artwork={artwork}
            includePrice={includePrices}
          />
        ))}
      </section>
    </article>
  );
}

function CatalogEntry({
  number,
  artwork,
  includePrice,
}: {
  number: number;
  artwork: Artwork;
  includePrice: boolean;
}) {
  const image = artwork.images[0];
  const year = formatYear(artwork);
  const lines = [
    formatMedium(artwork),
    formatDimensions(artwork),
    includePrice ? formatPrice(artwork) : null,
  ].filter(Boolean);

  return (
    <div className="catalog-entry">
      <span className="catalog-entry__number">{number}</span>
      <div className="catalog-entry__image">
        {image && <img src={thumbnailUrl(image.id)} alt="" />}
      </div>
      <div className="catalog-entry__label">
        {artwork.artist && (
          <p className="catalog-entry__artist">{artwork.artist}</p>
        )}
        <p>
          <span className="artwork-title">{artwork.title}</span>
          {year && `, ${year}`}
        </p>
        {lines.map((line) => (
          <p key={line} className="catalog-entry__detail">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
