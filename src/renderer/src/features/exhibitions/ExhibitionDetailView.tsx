import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ExhibitionDetail } from "../../../../shared/exhibition";
import { formatDateRange } from "../../../../shared/exhibitionFormat";
import { thumbnailUrl } from "../../../../shared/media";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ChooseArtworksDialog } from "./ChooseArtworksDialog";
import { ExhibitionFormDialog } from "./ExhibitionFormDialog";

interface ExhibitionDetailViewProps {
  exhibitionId: string;
  onBack: () => void;
}

type Dialog = "edit" | "add" | "delete" | null;

export function ExhibitionDetailView({
  exhibitionId,
  onBack,
}: ExhibitionDetailViewProps) {
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(() => {
    window.artGallery
      .getExhibition(exhibitionId)
      .then(setExhibition, () => setFailed(true));
  }, [exhibitionId]);
  useEffect(load, [load]);

  if (failed) {
    return (
      <p className="exhibitions__status" role="alert">
        No se pudo abrir la exposición.
      </p>
    );
  }
  if (!exhibition) {
    return (
      <p className="exhibitions__status" role="status">
        Cargando exposición…
      </p>
    );
  }

  const ids = exhibition.artworks.map(({ id }) => id);
  const saveOrder = async (order: string[]) =>
    setExhibition(
      await window.artGallery.setExhibitionArtworks(exhibition.id, order),
    );
  const move = (index: number, offset: -1 | 1) => {
    const order = [...ids];
    [order[index], order[index + offset]] = [
      order[index + offset]!,
      order[index]!,
    ];
    void saveOrder(order);
  };
  const dates = formatDateRange(exhibition);

  return (
    <section className="exhibition" aria-labelledby="exhibition-title">
      <header className="page-header exhibition__header">
        <button type="button" className="button" onClick={onBack}>
          <ArrowLeft aria-hidden size={18} />
          Exposiciones
        </button>
        <div className="exhibition__heading">
          <h1 id="exhibition-title" className="page-header__title">
            {exhibition.name}
          </h1>
          {(exhibition.venue || dates) && (
            <p className="exhibition__meta">
              {[exhibition.venue, dates].filter(Boolean).join(". ")}
            </p>
          )}
        </div>
        <div className="toolbar page-header__action">
          <button
            type="button"
            className="button"
            onClick={() => setDialog("edit")}
          >
            <Pencil aria-hidden size={16} />
            Editar
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setDialog("delete")}
          >
            <Trash2 aria-hidden size={16} />
            Eliminar
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setDialog("add")}
          >
            <Plus aria-hidden size={18} />
            Añadir obras
          </button>
        </div>
      </header>

      {exhibition.description && (
        <p className="exhibition__description">{exhibition.description}</p>
      )}

      {exhibition.artworks.length === 0 ? (
        <p className="exhibitions__status">
          Esta exposición todavía no tiene obras. Añádelas desde aquí o
          seleccionándolas en la Galería.
        </p>
      ) : (
        <ol
          className="exhibition-artworks"
          aria-label="Obras en orden de exposición"
        >
          {exhibition.artworks.map((artwork, index) => (
            <li key={artwork.id} className="exhibition-artwork">
              <span className="exhibition-artwork__number" aria-hidden>
                {index + 1}
              </span>
              {artwork.primaryImageId ? (
                <img
                  className="exhibition-artwork__image"
                  src={thumbnailUrl(artwork.primaryImageId)}
                  alt=""
                />
              ) : (
                <div className="exhibition-artwork__image" aria-hidden />
              )}
              <div className="exhibition-artwork__text">
                <span className="artwork-title">{artwork.title}</span>
                {artwork.artist && (
                  <span className="exhibition-artwork__artist">
                    {artwork.artist}
                  </span>
                )}
              </div>
              <div className="exhibition-artwork__actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Subir «${artwork.title}»`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Bajar «${artwork.title}»`}
                  disabled={index === ids.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Quitar «${artwork.title}» de la exposición`}
                  onClick={() =>
                    saveOrder(ids.filter((id) => id !== artwork.id))
                  }
                >
                  <X aria-hidden size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {dialog === "edit" && (
        <ExhibitionFormDialog
          exhibition={exhibition}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            load();
          }}
        />
      )}
      {dialog === "add" && (
        <ChooseArtworksDialog
          excludedIds={ids}
          onClose={() => setDialog(null)}
          onChoose={async (artworkIds) => {
            setDialog(null);
            setExhibition(
              await window.artGallery.addToExhibition(
                exhibition.id,
                artworkIds,
              ),
            );
          }}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title={`¿Eliminar la exposición «${exhibition.name}»?`}
          message="Se eliminará la exposición. Sus obras seguirán en el inventario."
          confirmLabel="Eliminar exposición"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await window.artGallery.deleteExhibition(exhibition.id);
            onBack();
          }}
        />
      )}
    </section>
  );
}
