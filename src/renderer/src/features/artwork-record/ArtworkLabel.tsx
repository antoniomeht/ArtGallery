import type { Artwork } from "../../../../shared/artwork";
import {
  formatDimensions,
  formatPrice,
  formatYear,
  STATUS_LABELS,
} from "../../../../shared/artworkFormat";

interface ArtworkLabelProps {
  artwork: Artwork;
}

/** Read-only record laid out like a museum wall label, then the details. */
export function ArtworkLabel({ artwork }: ArtworkLabelProps) {
  const techniqueAndSupport = [artwork.technique, artwork.support]
    .filter(Boolean)
    .join(" sobre ");
  const details: [string, string | null][] = [
    ["Categoría", artwork.category],
    ["Estado", STATUS_LABELS[artwork.status]],
    ["Ubicación", artwork.location],
    ["Precio", formatPrice(artwork)],
  ];

  return (
    <article className="label">
      <header className="label__heading">
        {artwork.artist && <p className="label__artist">{artwork.artist}</p>}
        <h2 className="label__title">
          <span className="artwork-title">{artwork.title}</span>
          {formatYear(artwork) && <span>, {formatYear(artwork)}</span>}
        </h2>
        {techniqueAndSupport && <p>{techniqueAndSupport}</p>}
        {formatDimensions(artwork) && <p>{formatDimensions(artwork)}</p>}
      </header>

      <dl className="label__details">
        {details
          .filter(([, value]) => value)
          .map(([term, value]) => (
            <div key={term} className="label__detail">
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {artwork.tags.length > 0 && (
        <ul className="label__tags" aria-label="Etiquetas">
          {artwork.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
      )}

      {artwork.description && (
        <section className="label__text">
          <h3>Descripción</h3>
          <p>{artwork.description}</p>
        </section>
      )}

      {artwork.notes && (
        <section className="label__text">
          <h3>Notas</h3>
          <p>{artwork.notes}</p>
        </section>
      )}
    </article>
  );
}
