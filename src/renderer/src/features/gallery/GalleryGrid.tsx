import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import "./GalleryGrid.css";

interface GalleryGridProps {
  artworks: readonly ArtworkSummary[];
  onOpen: (artworkId: string) => void;
}

export function GalleryGrid({ artworks, onOpen }: GalleryGridProps) {
  return (
    <ul className="gallery-grid" aria-label="Obras">
      {artworks.map((artwork) => (
        <li key={artwork.id} className="gallery-grid__item">
          <button
            type="button"
            className="gallery-tile"
            onClick={() => onOpen(artwork.id)}
          >
            {artwork.primaryImageId ? (
              <img
                className="gallery-tile__image"
                src={thumbnailUrl(artwork.primaryImageId)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="gallery-tile__placeholder" aria-hidden />
            )}
            <span className="gallery-tile__caption">
              <span className="artwork-title">{artwork.title}</span>
              {artwork.artist && (
                <span className="gallery-tile__artist">{artwork.artist}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
