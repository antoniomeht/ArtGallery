import { Check, Pencil } from "lucide-react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import { useLongPress } from "../../hooks/useLongPress";
import { dropTargetValue } from "../drop/dropRouter";
import "./GalleryGrid.css";

interface GalleryGridProps {
  artworks: readonly ArtworkSummary[];
  /** When set, the grid is in selection mode and tiles toggle selection. */
  selectedIds: ReadonlySet<string> | null;
  onOpen: (artworkId: string) => void;
  onToggle: (artworkId: string) => void;
  /** Holding a tile, or Shift+Enter on it, starts selecting from that artwork. */
  onStartSelection?: (artworkId: string) => void;
}

export function GalleryGrid({
  artworks,
  selectedIds,
  onOpen,
  onToggle,
  onStartSelection,
}: GalleryGridProps) {
  // Holding a tile while selecting simply toggles it, like a click.
  const { pressHandlers, consumeClick } = useLongPress((artworkId: string) =>
    selectedIds ? onToggle(artworkId) : onStartSelection?.(artworkId),
  );

  return (
    <ul className="gallery-grid" aria-label="Obras">
      {artworks.map((artwork) => {
        const isSelected = selectedIds?.has(artwork.id) ?? false;
        return (
          <li key={artwork.id} className="gallery-grid__item">
            <button
              type="button"
              className="gallery-tile"
              data-drop-target={dropTargetValue({
                type: "artwork",
                id: artwork.id,
              })}
              data-drop-label={artwork.title}
              aria-pressed={selectedIds ? isSelected : undefined}
              aria-keyshortcuts={selectedIds ? undefined : "Shift+Enter"}
              {...pressHandlers(artwork.id)}
              onKeyDown={(event) => {
                if (!selectedIds && event.shiftKey && event.key === "Enter") {
                  event.preventDefault();
                  onStartSelection?.(artwork.id);
                }
              }}
              onClick={() => {
                if (consumeClick()) return;
                if (selectedIds) onToggle(artwork.id);
                else onOpen(artwork.id);
              }}
            >
              {artwork.primaryImageId ? (
                <img
                  className="gallery-tile__image"
                  src={thumbnailUrl(artwork.primaryImageId)}
                  alt=""
                  draggable={false}
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
              {selectedIds ? (
                <span className="gallery-tile__check" aria-hidden>
                  {isSelected && <Check size={16} strokeWidth={3} />}
                </span>
              ) : (
                artwork.needsReview && (
                  <span className="gallery-tile__pending" title="Faltan datos">
                    <Pencil aria-hidden size={14} strokeWidth={2.25} />
                    <span className="visually-hidden">, faltan datos</span>
                  </span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
