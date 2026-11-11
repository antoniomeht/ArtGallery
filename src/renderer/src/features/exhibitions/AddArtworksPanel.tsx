import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { GalleryGrid } from "../gallery/GalleryGrid";
import { Button } from "../../components/Button";

interface AddArtworksPanelProps {
  /** Artworks already in the exhibition, which are not offered again. */
  excludedIds: readonly string[];
  onCancel: () => void;
  onAdd: (artworkIds: string[]) => void;
}

/** Picks artworks from the inventory, searching by any field. */
export function AddArtworksPanel({
  excludedIds,
  onCancel,
  onAdd,
}: AddArtworksPanelProps) {
  const [text, setText] = useState("");
  const [artworks, setArtworks] = useState<ArtworkSummary[] | null>(null);
  // Kept while the search changes, so several searches add up.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Fixed when the panel opens; the parent rebuilds the array on render.
  const [excluded] = useState(() => new Set(excludedIds));

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listArtworks({ sort: "title", text: text.trim() || undefined })
      .then((found) => {
        if (isCurrent) setArtworks(found.filter(({ id }) => !excluded.has(id)));
      });
    return () => {
      isCurrent = false;
    };
  }, [text, excluded]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      className="add-artworks"
      aria-labelledby="add-artworks-title"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onCancel();
      }}
    >
      <header className="add-artworks__header">
        <h2 id="add-artworks-title" className="dialog__title">
          Añadir obras a la exposición
        </h2>
        <label className="gallery-search add-artworks__search">
          <Search aria-hidden size={16} className="gallery-search__icon" />
          <span className="visually-hidden">Buscar obras</span>
          <input
            type="search"
            className="field__input gallery-search__input"
            placeholder="Buscar por título, artista, técnica…"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="add-artworks__actions">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={selected.size === 0}
            onClick={() => onAdd([...selected])}
          >
            {selected.size === 1
              ? "Añadir 1 obra"
              : `Añadir ${selected.size} obras`}
          </Button>
        </div>
      </header>
      {artworks === null && <p role="status">Cargando obras…</p>}
      {artworks?.length === 0 && (
        <p className="exhibitions__status">
          {text.trim()
            ? `Ninguna obra fuera de la exposición coincide con «${text.trim()}».`
            : "Todas las obras del inventario ya están en esta exposición."}
        </p>
      )}
      {artworks && artworks.length > 0 && (
        <GalleryGrid
          artworks={artworks}
          selectedIds={selected}
          onOpen={toggle}
          onToggle={toggle}
        />
      )}
    </section>
  );
}
