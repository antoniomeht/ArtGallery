import { Plus } from "lucide-react";
import { useState } from "react";
import { NewArtworkDialog } from "../new-artwork/NewArtworkDialog";
import { GalleryGrid } from "./GalleryGrid";
import { useArtworks } from "./useArtworks";
import "./GalleryPage.css";

export function GalleryPage() {
  const { state, reload } = useArtworks();
  const [isAdding, setIsAdding] = useState(false);
  const openNewArtwork = () => setIsAdding(true);

  return (
    <section className="gallery-page" aria-labelledby="gallery-title">
      <header className="page-header">
        <h1 id="gallery-title" className="page-header__title">
          Galería
        </h1>
        {state.status === "ready" && state.artworks.length > 0 && (
          <>
            <p className="page-header__count">
              {state.artworks.length === 1
                ? "1 obra"
                : `${state.artworks.length} obras`}
            </p>
            <button
              type="button"
              className="button button--primary page-header__action"
              onClick={openNewArtwork}
            >
              <Plus aria-hidden size={18} />
              Añadir obra
            </button>
          </>
        )}
      </header>

      {state.status === "loading" && (
        <p className="gallery-status" role="status">
          Cargando obras…
        </p>
      )}

      {state.status === "error" && (
        <div className="gallery-status" role="alert">
          <p>No se pudo leer el inventario.</p>
          <button type="button" className="button" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === "ready" && state.artworks.length === 0 && (
        <div className="gallery-empty">
          <div className="gallery-empty__frame" aria-hidden />
          <p className="gallery-empty__text">
            Aún no hay obras en el inventario.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={openNewArtwork}
          >
            <Plus aria-hidden size={18} />
            Añadir la primera obra
          </button>
        </div>
      )}

      {state.status === "ready" && state.artworks.length > 0 && (
        <GalleryGrid artworks={state.artworks} />
      )}

      {isAdding && (
        <NewArtworkDialog
          onClose={() => setIsAdding(false)}
          onCreated={() => {
            setIsAdding(false);
            reload();
          }}
        />
      )}
    </section>
  );
}
