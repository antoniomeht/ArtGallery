import { useEffect, useRef, useState } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { GalleryGrid } from "../gallery/GalleryGrid";
import { Button } from "../../components/Button";

interface ChooseArtworksDialogProps {
  /** Artworks already in the exhibition, which are not offered again. */
  excludedIds: readonly string[];
  onClose: () => void;
  onChoose: (artworkIds: string[]) => void;
}

/** Picks artworks from the inventory to add to an exhibition. */
export function ChooseArtworksDialog({
  excludedIds,
  onClose,
  onChoose,
}: ChooseArtworksDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [artworks, setArtworks] = useState<ArtworkSummary[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Fixed when the dialog opens; the parent rebuilds the array on render.
  const [excluded] = useState(() => new Set(excludedIds));

  useEffect(() => {
    dialogRef.current?.showModal();
    void window.artGallery
      .listArtworks({ sort: "title" })
      .then((all) => setArtworks(all.filter(({ id }) => !excluded.has(id))));
  }, [excluded]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog--wide"
      aria-labelledby="choose-artworks-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="choose-artworks-title" className="dialog__title">
          Añadir obras a la exposición
        </h2>
        {artworks === null && <p role="status">Cargando obras…</p>}
        {artworks?.length === 0 && (
          <p>Todas las obras del inventario ya están en esta exposición.</p>
        )}
        {artworks && artworks.length > 0 && (
          <div className="dialog__scroll">
            <GalleryGrid
              artworks={artworks}
              selectedIds={selected}
              onOpen={toggle}
              onToggle={toggle}
            />
          </div>
        )}
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={selected.size === 0}
            onClick={() => onChoose([...selected])}
          >
            {selected.size === 1
              ? "Añadir 1 obra"
              : `Añadir ${selected.size} obras`}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
