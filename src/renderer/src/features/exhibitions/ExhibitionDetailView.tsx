import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileDown,
  FileText,
  Tags,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ExhibitionDetail } from "../../../../shared/exhibition";
import { formatDateRange } from "../../../../shared/exhibitionFormat";
import { thumbnailUrl } from "../../../../shared/media";
import { ActionNotice, type NoticeAction } from "../../components/ActionNotice";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { LabelsDialog } from "../labels/LabelsDialog";
import { LinkedDocuments } from "../documents/LinkedDocuments";
import { dropTargetValue } from "../drop/dropRouter";
import { CatalogDialog } from "./CatalogDialog";
import { ChooseArtworksDialog } from "./ChooseArtworksDialog";
import { ExhibitionForm } from "./ExhibitionForm";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";

interface ExhibitionDetailViewProps {
  exhibitionId: string;
  onBack: () => void;
}

type Dialog = "add" | "delete" | "catalog" | "labels" | null;

export function ExhibitionDetailView({
  exhibitionId,
  onBack,
}: ExhibitionDetailViewProps) {
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<NoticeAction | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    <section
      className="exhibition"
      aria-labelledby="exhibition-title"
      data-drop-target={dropTargetValue({
        type: "exhibition",
        id: exhibition.id,
      })}
      data-drop-label={exhibition.name}
    >
      <header className="page-header exhibition__header">
        <Button onClick={onBack}>
          <ArrowLeft aria-hidden size={16} />
          Exposiciones
        </Button>
        {isEditing ? (
          <ExhibitionForm
            className="exhibition-edit"
            exhibition={exhibition}
            onCancel={() => setIsEditing(false)}
            onSaved={() => {
              setIsEditing(false);
              load();
            }}
          />
        ) : (
          <>
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
              <Button onClick={() => setIsEditing(true)}>
                <Pencil aria-hidden size={16} />
                Editar
              </Button>
              <Button
                onClick={async () => {
                  const result = await window.artGallery.exportExhibition(
                    exhibition.id,
                  );
                  if (result) {
                    setNotice({
                      message: `Exposición exportada a ${result.path}`,
                    });
                  }
                }}
              >
                <FileDown aria-hidden size={16} />
                Exportar…
              </Button>
              <Button
                disabled={exhibition.artworks.length === 0}
                onClick={() => setDialog("catalog")}
              >
                <FileText aria-hidden size={16} />
                Catálogo PDF…
              </Button>
              <Button
                disabled={exhibition.artworks.length === 0}
                onClick={() => setDialog("labels")}
              >
                <Tags aria-hidden size={16} />
                Cartelas…
              </Button>
              <Button onClick={() => setDialog("delete")}>
                <Trash2 aria-hidden size={16} />
                Eliminar
              </Button>
              <Button variant="primary" onClick={() => setDialog("add")}>
                <Plus aria-hidden size={16} />
                Añadir obras
              </Button>
            </div>
          </>
        )}
      </header>

      {!isEditing && exhibition.description && (
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
                <IconButton
                  aria-label={`Subir «${artwork.title}»`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden size={16} />
                </IconButton>
                <IconButton
                  aria-label={`Bajar «${artwork.title}»`}
                  disabled={index === ids.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden size={16} />
                </IconButton>
                <IconButton
                  aria-label={`Quitar «${artwork.title}» de la exposición`}
                  onClick={() =>
                    saveOrder(ids.filter((id) => id !== artwork.id))
                  }
                >
                  <X aria-hidden size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="exhibition__documents">
        <LinkedDocuments
          target={{ type: "exhibition", id: exhibition.id }}
          targetLabel={exhibition.name}
        />
      </div>

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
      {dialog === "catalog" && (
        <CatalogDialog
          exhibitionId={exhibition.id}
          onClose={() => setDialog(null)}
          onSaved={(path) => {
            setDialog(null);
            setNotice({ message: `Catálogo guardado en ${path}` });
          }}
        />
      )}
      {dialog === "labels" && (
        <LabelsDialog
          source={{ exhibitionId: exhibition.id }}
          onClose={() => setDialog(null)}
          onSaved={(path) => {
            setDialog(null);
            setNotice({ message: `Cartelas guardadas en ${path}` });
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

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}
