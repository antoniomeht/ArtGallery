import { Check } from "lucide-react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import "./GalleryGrid.css";

interface GalleryGridProps {
  artworks: readonly ArtworkSummary[];
  /** When set, the grid is in selection mode and tiles toggle selection. */
  selectedIds: ReadonlySet<string> | null;
  onOpen: (artworkId: string) => void;
  onToggle?: (artworkId: string) => void;
}

export function GalleryGrid({
  artworks,
  selectedIds,
  onOpen,
  onToggle,
}: GalleryGridProps) {
  return (
    <ul className="gallery-grid" aria-label="Obras">
      {artworks.map((artwork) => {
        const isSelected = selectedIds?.has(artwork.id) ?? false;
        return (
          <li key={artwork.id} className="gallery-grid__item">
            <button
              type="button"
              className="gallery-tile"
              aria-pressed={selectedIds ? isSelected : undefined}
              onClick={() =>
                selectedIds ? onToggle?.(artwork.id) : onOpen(artwork.id)
              }
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
              {selectedIds && (
                <span className="gallery-tile__check" aria-hidden>
                  {isSelected && <Check size={16} strokeWidth={3} />}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
