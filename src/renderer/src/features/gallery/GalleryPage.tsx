import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArtworkSort,
  ArtworkStatus,
  FilterOptions,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { ActionNotice } from "../../components/ActionNotice";
import { useActionNotice } from "../../hooks/useActionNotice";
import { useArtworkList } from "../../hooks/useArtworkList";
import { useCollections } from "../../hooks/useCollections";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ManageCollectionsDialog } from "../collections/ManageCollectionsDialog";
import { ArtworkRecordDialog } from "../artwork-record/ArtworkRecordDialog";
import { LabelsDialog } from "../labels/LabelsDialog";
import { AddToExhibitionDialog } from "./AddToExhibitionDialog";
import { GalleryFilters } from "./GalleryFilters";
import { EMPTY_FILTERS, hasActiveFilters, toArtworkQuery } from "./filterModel";
import { GalleryGrid } from "./GalleryGrid";
import { countLabel, galleryGroups } from "./galleryGroups";
import { GalleryToolbar } from "./GalleryToolbar";
import { SelectionToolbar } from "./SelectionToolbar";
import { Button } from "../../components/Button";
import "./GalleryPage.css";

interface GalleryPageProps {
  /** Changes when artworks were added from outside this page. */
  inventoryVersion: number;
  onAdd: () => void;
}

export function GalleryPage({ inventoryVersion, onAdd }: GalleryPageProps) {
  const [sort, setSort] = useState<ArtworkSort>("year-desc");
  const [chosenFilters, setFilters] = useState(EMPTY_FILTERS);
  const { collections, reload: reloadCollections } =
    useCollections(inventoryVersion);
  // A deleted collection stops filtering, and filters again if restored.
  const filters = useMemo(
    () => ({
      ...chosenFilters,
      collections: chosenFilters.collections.filter((id) =>
        collections.some((collection) => collection.id === id),
      ),
    }),
    [chosenFilters, collections],
  );
  const [options, setOptions] = useState<FilterOptions | null>(null);
  // Typing should not query the database on every keystroke.
  const appliedFilters = useDebouncedValue(filters, 250);
  const listArtworks = useCallback(
    () =>
      window.artGallery.listArtworks({
        ...toArtworkQuery(appliedFilters),
        sort,
      }),
    [appliedFilters, sort],
  );
  const listAllArtworks = useCallback(
    () => window.artGallery.listArtworks(),
    [],
  );
  const results = useArtworkList(listArtworks, inventoryVersion);
  const inventory = useArtworkList(listAllArtworks, inventoryVersion);
  const { state, reload: reloadResults } = results;
  const { reload: reloadInventory } = inventory;
  const loadOptions = useCallback(() => {
    void window.artGallery.listFilterOptions().then(setOptions);
  }, []);
  useEffect(loadOptions, [loadOptions, inventoryVersion]);
  const reload = useCallback(() => {
    reloadResults();
    reloadInventory();
    loadOptions();
    reloadCollections();
  }, [reloadResults, reloadInventory, loadOptions, reloadCollections]);
  const { notice, setNotice, moveToTrash } = useActionNotice(reload);
  const [openArtworkId, setOpenArtworkId] = useState<string | null>(null);
  /** Null outside selection mode. */
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [isChoosingExhibition, setIsChoosingExhibition] = useState(false);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);
  const [isManagingCollections, setIsManagingCollections] = useState(false);

  const artworks = useMemo(
    () => (state.status === "ready" ? state.artworks : []),
    [state],
  );
  const totalCount =
    inventory.state.status === "ready" ? inventory.state.artworks.length : 0;
  const isFiltering = hasActiveFilters(appliedFilters);
  const isSelecting = selectedIds !== null;
  /** Actions only reach what is on screen, never artworks filtered away. */
  const visibleSelection = useMemo(
    () =>
      selectedIds &&
      new Set(artworks.map(({ id }) => id).filter((id) => selectedIds.has(id))),
    [artworks, selectedIds],
  );

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
        {totalCount > 0 && (
          <>
            <p className="page-header__count" aria-live="polite">
              {isFiltering
                ? `${artworks.length} de ${countLabel(totalCount)}`
                : countLabel(totalCount)}
            </p>
            <div className="page-header__action">
              {visibleSelection ? (
                <SelectionToolbar
                  selectedIds={[...visibleSelection]}
                  collections={collections}
                  onCollectionsChanged={reload}
                  totalCount={artworks.length}
                  onSelectAll={() =>
                    setSelectedIds(new Set(artworks.map(({ id }) => id)))
                  }
                  onClear={() => setSelectedIds(new Set())}
                  onSetStatus={(status) =>
                    setStatus([...visibleSelection], status)
                  }
                  onMoveToTrash={() => {
                    void moveToTrash(
                      [...visibleSelection],
                      `${countLabel(visibleSelection.size)} movidas a la papelera.`,
                    );
                    setSelectedIds(null);
                  }}
                  onExport={async () => {
                    const result = await window.artGallery.exportPackage([
                      ...visibleSelection,
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
                  onAdd={onAdd}
                />
              )}
            </div>
          </>
        )}
      </header>

      {totalCount > 0 && (
        <GalleryFilters
          filters={filters}
          options={options}
          collections={collections}
          onChange={setFilters}
          onManageCollections={() => setIsManagingCollections(true)}
        />
      )}

      {state.status === "loading" && (
        <p className="gallery-status" role="status">
          Cargando obras…
        </p>
      )}

      {state.status === "error" && (
        <div className="gallery-status" role="alert">
          <p>No se pudo leer el inventario.</p>
          <Button onClick={reload}>Reintentar</Button>
        </div>
      )}

      {state.status === "ready" && artworks.length === 0 && isFiltering && (
        <div className="gallery-status">
          <p>
            Ninguna obra coincide con esta búsqueda. Prueba con menos filtros o
            con otras palabras.
          </p>
          <Button onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpiar filtros
          </Button>
        </div>
      )}

      {state.status === "ready" && artworks.length === 0 && !isFiltering && (
        <div className="gallery-empty">
          <div className="gallery-empty__frame" aria-hidden />
          <p className="gallery-empty__text">
            Aún no hay obras en el inventario.
          </p>
          <Button variant="primary" onClick={onAdd}>
            <Plus aria-hidden size={16} />
            Añadir la primera obra
          </Button>
        </div>
      )}

      {artworks.length > 0 && (
        <GalleryGrid
          artworks={artworks}
          groups={galleryGroups(artworks, sort)}
          selectedIds={visibleSelection}
          onOpen={setOpenArtworkId}
          onToggle={toggle}
          onStartSelection={(id) => setSelectedIds(new Set([id]))}
        />
      )}

      {openArtworkId && (
        <ArtworkRecordDialog
          artworkId={openArtworkId}
          onClose={() => setOpenArtworkId(null)}
          onChanged={reload}
          gallery={{ artworks, onNavigate: setOpenArtworkId }}
          onMoveToTrash={(artwork) => {
            setOpenArtworkId(null);
            void moveToTrash(
              [artwork.id],
              `«${artwork.title}» se ha movido a la papelera.`,
            );
          }}
        />
      )}

      {isPrintingLabels && visibleSelection && (
        <LabelsDialog
          source={{ artworkIds: [...visibleSelection] }}
          onClose={() => setIsPrintingLabels(false)}
          onSaved={(path) => {
            setIsPrintingLabels(false);
            setNotice({ message: `Cartelas guardadas en ${path}` });
          }}
        />
      )}
      {isChoosingExhibition && visibleSelection && (
        <AddToExhibitionDialog
          artworkCount={visibleSelection.size}
          onClose={() => setIsChoosingExhibition(false)}
          onChoose={async (exhibition) => {
            setIsChoosingExhibition(false);
            await window.artGallery.addToExhibition(exhibition.id, [
              ...visibleSelection,
            ]);
            setNotice({
              message: `${countLabel(visibleSelection.size)} añadidas a «${exhibition.name}».`,
            });
            setSelectedIds(null);
          }}
        />
      )}

      {isManagingCollections && (
        <ManageCollectionsDialog
          collections={collections}
          onChanged={reload}
          onDeleted={(deleted) => {
            reload();
            setNotice({
              message: `Colección «${deleted.name}» eliminada. Sus obras siguen en la Galería.`,
              undo: async () => {
                await window.artGallery.restoreCollection(deleted);
                reload();
              },
            });
          }}
          onClose={() => setIsManagingCollections(false)}
        />
      )}

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}
