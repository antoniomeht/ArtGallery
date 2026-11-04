import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { thumbnailUrl } from "../../../../shared/media";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useArtworkList } from "../../hooks/useArtworkList";
import { Button } from "../../components/Button";
import "./TrashPage.css";

const listTrash = () => window.artGallery.listTrash();

const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

/** What the user is about to delete permanently. */
type PendingDeletion =
  { kind: "one"; artwork: ArtworkSummary } | { kind: "all" };

export function TrashPage() {
  const { state, reload } = useArtworkList(listTrash);
  const [pending, setPending] = useState<PendingDeletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, errorMessage: string) {
    setError(null);
    try {
      await action();
    } catch {
      setError(errorMessage);
    }
    reload();
  }

  const artworks = state.status === "ready" ? state.artworks : [];

  return (
    <section className="trash-page" aria-labelledby="trash-title">
      <header className="page-header">
        <h1 id="trash-title" className="page-header__title">
          Papelera
        </h1>
        {artworks.length > 0 && (
          <Button
            className="page-header__action"
            onClick={() => setPending({ kind: "all" })}
          >
            <Trash2 aria-hidden size={16} />
            Vaciar papelera
          </Button>
        )}
      </header>

      <p className="trash-page__intro">
        Las obras de la papelera conservan sus datos e imágenes hasta que las
        elimines definitivamente.
      </p>

      {error && (
        <p className="trash-page__error" role="alert">
          {error}
        </p>
      )}

      {state.status === "loading" && (
        <p className="trash-page__status" role="status">
          Cargando papelera…
        </p>
      )}
      {state.status === "error" && (
        <p className="trash-page__status" role="alert">
          No se pudo leer la papelera.
        </p>
      )}
      {state.status === "ready" && artworks.length === 0 && (
        <p className="trash-page__status">La papelera está vacía.</p>
      )}

      {artworks.length > 0 && (
        <ul className="trash-list" aria-label="Obras en la papelera">
          {artworks.map((artwork) => (
            <li key={artwork.id} className="trash-item">
              {artwork.primaryImageId ? (
                <img
                  className="trash-item__image"
                  src={thumbnailUrl(artwork.primaryImageId)}
                  alt=""
                />
              ) : (
                <div className="trash-item__image" aria-hidden />
              )}
              <div className="trash-item__text">
                <span className="artwork-title">{artwork.title}</span>
                <span className="trash-item__meta">
                  {[
                    artwork.artist,
                    artwork.deletedAt &&
                      `En la papelera desde el ${dateFormat.format(new Date(artwork.deletedAt))}`,
                  ]
                    .filter(Boolean)
                    .join(". ")}
                </span>
              </div>
              <div className="trash-item__actions">
                <Button
                  onClick={() =>
                    run(
                      () => window.artGallery.restoreFromTrash([artwork.id]),
                      "No se pudo restaurar la obra.",
                    )
                  }
                >
                  <RotateCcw aria-hidden size={16} />
                  Restaurar
                </Button>
                <Button onClick={() => setPending({ kind: "one", artwork })}>
                  Eliminar definitivamente
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === "all"
              ? "¿Vaciar la papelera?"
              : `¿Eliminar «${pending.artwork.title}» definitivamente?`
          }
          message={
            pending.kind === "all"
              ? `Se eliminarán ${artworks.length === 1 ? "1 obra" : `${artworks.length} obras`} con sus imágenes. No se puede deshacer.`
              : "Se eliminarán la obra y sus imágenes. No se puede deshacer."
          }
          confirmLabel={
            pending.kind === "all"
              ? "Vaciar papelera"
              : "Eliminar definitivamente"
          }
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setPending(null);
            void run(
              () =>
                pending.kind === "all"
                  ? window.artGallery.emptyTrash()
                  : window.artGallery.deleteFromTrash([pending.artwork.id]),
              "No se pudo eliminar. Inténtalo de nuevo.",
            );
          }}
        />
      )}
    </section>
  );
}
