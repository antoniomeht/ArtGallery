import { useEffect, useRef, useState } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import { Button } from "../../components/Button";

interface ArtworkImageDialogProps {
  onClose: () => void;
  onChoose: (artwork: ArtworkSummary & { primaryImageId: string }) => void;
}

/** Picks the artwork whose main image goes into the document. */
export function ArtworkImageDialog({
  onClose,
  onChoose,
}: ArtworkImageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [artworks, setArtworks] = useState<ArtworkSummary[] | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listArtworks({ text, sort: "title" })
      .then((list) => isCurrent && setArtworks(list));
    return () => {
      isCurrent = false;
    };
  }, [text]);

  const withImage = (artworks ?? []).filter(
    (artwork): artwork is ArtworkSummary & { primaryImageId: string } =>
      artwork.primaryImageId !== null,
  );

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog--wide"
      aria-labelledby="artwork-image-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="artwork-image-title" className="dialog__title">
          Insertar imagen de una obra
        </h2>
        <input
          type="search"
          className="field__input"
          aria-label="Buscar obras"
          placeholder="Buscar por título, artista…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {artworks && withImage.length === 0 && (
          <p className="dialog__message">
            No hay obras con imagen que coincidan.
          </p>
        )}
        <ul className="artwork-picker">
          {withImage.map((artwork) => (
            <li key={artwork.id}>
              <button
                type="button"
                className="artwork-picker__item"
                onClick={() => {
                  onChoose(artwork);
                  dialogRef.current?.close();
                }}
              >
                <img src={thumbnailUrl(artwork.primaryImageId)} alt="" />
                <span>{artwork.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
        </div>
      </div>
    </dialog>
  );
}
