import { useState } from "react";
import type { Artwork } from "../../../../shared/artwork";
import { originalUrl, thumbnailUrl } from "../../../../shared/media";

interface ImageViewerProps {
  artwork: Artwork;
}

export function ImageViewer({ artwork }: ImageViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = artwork.images[selectedIndex] ?? artwork.images[0];

  if (!selected) {
    return (
      <div className="viewer viewer--empty">
        <p>Esta obra todavía no tiene imágenes.</p>
      </div>
    );
  }

  return (
    <div className="viewer">
      <img
        className="viewer__image"
        src={originalUrl(selected.fileName)}
        alt={artwork.title}
      />
      {artwork.images.length > 1 && (
        <ul className="viewer__strip" aria-label="Imágenes de la obra">
          {artwork.images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className="viewer__thumb"
                aria-label={`Ver imagen ${index + 1} de ${artwork.images.length}`}
                aria-pressed={image.id === selected.id}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={thumbnailUrl(image.id)} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
