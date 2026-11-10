import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import { neighbourId } from "./recordNavigation";

interface RecordCarouselProps {
  /** The gallery as shown, with its order and filters. */
  artworks: readonly ArtworkSummary[];
  currentId: string;
  onNavigate: (artworkId: string) => void;
}

/** Strip of the gallery under the record, marking where the open artwork is. */
export function RecordCarousel({
  artworks,
  currentId,
  onNavigate,
}: RecordCarouselProps) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const ids = artworks.map(({ id }) => id);
  const position = ids.indexOf(currentId);
  const previous = neighbourId(ids, currentId, -1);
  const next = neighbourId(ids, currentId, 1);

  useEffect(() => {
    currentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentId]);

  return (
    <nav className="record-carousel" aria-label="Obras de la galería">
      <button
        type="button"
        className="record-carousel__step"
        aria-label="Obra anterior"
        aria-keyshortcuts="ArrowLeft"
        disabled={!previous}
        onClick={() => previous && onNavigate(previous)}
      >
        <ChevronLeft aria-hidden size={20} />
      </button>
      <ol className="record-carousel__strip">
        {artworks.map((artwork) => {
          const isCurrent = artwork.id === currentId;
          return (
            <li key={artwork.id}>
              <button
                ref={isCurrent ? currentRef : undefined}
                type="button"
                className="record-carousel__item"
                aria-current={isCurrent ? "true" : undefined}
                aria-label={artwork.title}
                title={artwork.title}
                onClick={() => onNavigate(artwork.id)}
              >
                {artwork.primaryImageId ? (
                  <img
                    src={thumbnailUrl(artwork.primaryImageId)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="record-carousel__placeholder" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="record-carousel__step"
        aria-label="Obra siguiente"
        aria-keyshortcuts="ArrowRight"
        disabled={!next}
        onClick={() => next && onNavigate(next)}
      >
        <ChevronRight aria-hidden size={20} />
      </button>
      {position !== -1 && (
        <p className="record-carousel__position" aria-live="polite">
          {position + 1} de {artworks.length}
        </p>
      )}
    </nav>
  );
}
