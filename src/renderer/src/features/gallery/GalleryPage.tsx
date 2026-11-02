import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ArtworkSort, ArtworkStatus } from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { ActionNotice } from "../../components/ActionNotice";
import { useActionNotice } from "../../hooks/useActionNotice";
import { useArtworkList } from "../../hooks/useArtworkList";
import { ArtworkRecordDialog } from "../artwork-record/ArtworkRecordDialog";
import { LabelsDialog } from "../labels/LabelsDialog";
import { AddToExhibitionDialog } from "./AddToExhibitionDialog";
import { NewArtworkDialog } from "../new-artwork/NewArtworkDialog";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryToolbar } from "./GalleryToolbar";
import { SelectionToolbar } from "./SelectionToolbar";
import "./GalleryPage.css";

const countLabel = (count: number) =>
  count === 1 ? "1 obra" : `${count} obras`;

export function GalleryPage() {
  const [sort, setSort] = useState<ArtworkSort>("recent");
  const listArtworks = useCallback(
    () => window.artGallery.listArtworks({ sort }),
    [sort],
  );
  const { state, reload } = useArtworkList(listArtworks);
  const { notice, setNotice, moveToTrash } = useActionNotice(reload);
  const [isAdding, setIsAdding] = useState(false);
  const [openArtworkId, setOpenArtworkId] = useState<string | null>(null);
  /** Null outside selection mode. */
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [isChoosingExhibition, setIsChoosingExhibition] = useState(false);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);

  const artworks = state.status === "ready" ? state.artworks : [];
  const isSelecting = selectedIds !== null;

  useEffect(() => {
    if (!isSelecting) return;
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIds(null);
    };
    window.addEventListener("keydown", exitOnEscape);
    return () => window.removeEventListener("keydown", exitOnEscape);
  }, [isSelecting]);

  function toggle(artworkId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(artworkId)) next.delete(artworkId);
      else next.add(artworkId);
      return next;
    });
  }

  async function setStatus(ids: string[], status: ArtworkStatus) {
    await window.artGallery.setStatus(ids, status);
    setNotice({
      message: `${countLabel(ids.length)} con estado «${STATUS_LABELS[status]}».`,
    });
    reload();
  }

  return (
    <section className="gallery-page" aria-labelledby="gallery-title">
      <header className="page-header">
        <h1 id="gallery-title" className="page-header__title">
          Galería
        </h1>
        {artworks.length > 0 && (
          <>
            <p className="page-header__count">{countLabel(artworks.length)}</p>
            <div className="page-header__action">
              {selectedIds ? (
                <SelectionToolbar
                  selectedCount={selectedIds.size}
                  totalCount={artworks.length}
                  onSelectAll={() =>
                    setSelectedIds(new Set(artworks.map(({ id }) => id)))
                  }
                  onClear={() => setSelectedIds(new Set())}
                  onSetStatus={(status) => setStatus([...selectedIds], status)}
                  onMoveToTrash={() => {
                    void moveToTrash(
                      [...selectedIds],
                      `${countLabel(selectedIds.size)} movidas a la papelera.`,
                    );
                    setSelectedIds(null);
                  }}
                  onExport={async () => {
                    const result = await window.artGallery.exportPackage([
                      ...selectedIds,
                    ]);
                    if (result) {
                      setNotice({
                        message: `${countLabel(result.artworks)} exportadas a ${result.path}`,
                      });
                    }
                  }}
                  onAddToExhibition={() => setIsChoosingExhibition(true)}
                  onPrintLabels={() => setIsPrintingLabels(true)}
                  onDone={() => setSelectedIds(null)}
                />
              ) : (
                <GalleryToolbar
                  sort={sort}
                  onSortChange={setSort}
                  onSelect={() => setSelectedIds(new Set())}
                  onAdd={() => setIsAdding(true)}
                />
              )}
            </div>
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

      {state.status === "ready" && artworks.length === 0 && (
        <div className="gallery-empty">
          <div className="gallery-empty__frame" aria-hidden />
          <p className="gallery-empty__text">
            Aún no hay obras en el inventario.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setIsAdding(true)}
          >
            <Plus aria-hidden size={18} />
            Añadir la primera obra
          </button>
        </div>
      )}

      {artworks.length > 0 && (
        <GalleryGrid
          artworks={artworks}
          selectedIds={selectedIds}
          onOpen={setOpenArtworkId}
          onToggle={toggle}
        />
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
      {openArtworkId && (
        <ArtworkRecordDialog
          artworkId={openArtworkId}
          onClose={() => setOpenArtworkId(null)}
          onChanged={reload}
          onMoveToTrash={(artwork) => {
            setOpenArtworkId(null);
            void moveToTrash(
              [artwork.id],
              `«${artwork.title}» se ha movido a la papelera.`,
            );
          }}
        />
      )}

      {isPrintingLabels && selectedIds && (
        <LabelsDialog
          source={{ artworkIds: [...selectedIds] }}
          onClose={() => setIsPrintingLabels(false)}
          onSaved={(path) => {
            setIsPrintingLabels(false);
            setNotice({ message: `Cartelas guardadas en ${path}` });
          }}
        />
      )}
      {isChoosingExhibition && selectedIds && (
        <AddToExhibitionDialog
          artworkCount={selectedIds.size}
          onClose={() => setIsChoosingExhibition(false)}
          onChoose={async (exhibition) => {
            setIsChoosingExhibition(false);
            await window.artGallery.addToExhibition(exhibition.id, [
              ...selectedIds,
            ]);
            setNotice({
              message: `${countLabel(selectedIds.size)} añadidas a «${exhibition.name}».`,
            });
            setSelectedIds(null);
          }}
        />
      )}

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}
