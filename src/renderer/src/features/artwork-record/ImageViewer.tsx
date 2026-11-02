import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Artwork } from "../../../../shared/artwork";
import { originalUrl, thumbnailUrl } from "../../../../shared/media";
import { ConfirmDialog } from "../../components/ConfirmDialog";

interface ImageViewerProps {
  artwork: Artwork;
  onArtworkChange: (artwork: Artwork) => void;
}

export function ImageViewer({ artwork, onArtworkChange }: ImageViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const { images } = artwork;
  const index = Math.min(selectedIndex, images.length - 1);
  const selected = images[index];

  /** Runs a change and selects the image chosen by `nextIndex`. */
  async function apply(
    change: () => Promise<Artwork>,
    nextIndex: (updated: Artwork) => number,
    errorMessage: string,
  ) {
    setIsBusy(true);
    setError(null);
    try {
      const updated = await change();
      setSelectedIndex(Math.max(0, nextIndex(updated)));
      onArtworkChange(updated);
    } catch {
      setError(errorMessage);
    } finally {
      setIsBusy(false);
    }
  }

  async function addImages() {
    const paths = await window.artGallery.pickImages();
    if (paths.length === 0) return;
    await apply(
      () => window.artGallery.addImages(artwork.id, paths),
      () => images.length,
      "No se pudieron añadir las imágenes. Comprueba que son JPG, PNG, WebP o TIFF.",
    );
  }

  const addButton = (
    <button
      type="button"
      className="button"
      disabled={isBusy}
      onClick={addImages}
    >
      <ImagePlus aria-hidden size={18} />
      Añadir imágenes
    </button>
  );

  if (!selected) {
    return (
      <div className="viewer viewer--empty">
        <p>Esta obra todavía no tiene imágenes.</p>
        {addButton}
        {error && <p role="alert">{error}</p>}
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

      {images.length > 1 && (
        <ul className="viewer__strip" aria-label="Imágenes de la obra">
          {images.map((image, imageIndex) => (
            <li key={image.id}>
              <button
                type="button"
                className="viewer__thumb"
                aria-label={`Ver imagen ${imageIndex + 1} de ${images.length}`}
                aria-pressed={imageIndex === index}
                onClick={() => setSelectedIndex(imageIndex)}
              >
                <img src={thumbnailUrl(image.id)} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="viewer__actions">
        {addButton}
        {index === 0 ? (
          <span className="viewer__primary">
            <Star aria-hidden size={16} />
            Imagen principal
          </span>
        ) : (
          <button
            type="button"
            className="button"
            disabled={isBusy}
            onClick={() =>
              apply(
                () =>
                  window.artGallery.setPrimaryImage(artwork.id, selected.id),
                () => 0,
                "No se pudo cambiar la imagen principal.",
              )
            }
          >
            <Star aria-hidden size={16} />
            Usar como principal
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={isBusy}
          onClick={() => setIsConfirmingRemoval(true)}
        >
          <Trash2 aria-hidden size={16} />
          Quitar imagen
        </button>
      </div>
      {error && (
        <p className="viewer__error" role="alert">
          {error}
        </p>
      )}

      {isConfirmingRemoval && (
        <ConfirmDialog
          title="¿Quitar esta imagen?"
          message="Se borrará la copia guardada en ArtGallery. La fotografía original de tu equipo no se modifica."
          confirmLabel="Quitar imagen"
          onCancel={() => setIsConfirmingRemoval(false)}
          onConfirm={() => {
            setIsConfirmingRemoval(false);
            void apply(
              () => window.artGallery.removeImage(artwork.id, selected.id),
              (updated) => Math.min(index, updated.images.length - 1),
              "No se pudo quitar la imagen.",
            );
          }}
        />
      )}
    </div>
  );
}
