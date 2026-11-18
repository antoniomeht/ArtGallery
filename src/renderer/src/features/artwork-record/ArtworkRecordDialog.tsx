import { ArrowLeft, Pencil, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Artwork, ArtworkSummary } from "../../../../shared/artwork";
import { useDimensionUnit } from "../../hooks/useDimensionUnit";
import { useHiddenFields } from "../../hooks/useHiddenFields";
import { ArtworkCollectionsField } from "../collections/ArtworkCollectionsField";
import { LinkedDocuments } from "../documents/LinkedDocuments";
import { ArtworkForm, type ArtworkFormHandle } from "./ArtworkForm";
import { ArtworkLabel } from "./ArtworkLabel";
import { ImageViewer } from "./ImageViewer";
import { RecordCarousel } from "./RecordCarousel";
import { navigationStep, neighbourId } from "./recordNavigation";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { NavigationContext, useNavigation } from "../../components/Navigation";
import { dropTargetValue } from "../drop/dropRouter";
import "./ArtworkRecordDialog.css";

interface ArtworkRecordDialogProps {
  artworkId: string;
  /** Just created: opens for editing and can be discarded while unsaved. */
  isNew?: boolean;
  onClose: () => void;
  /** Called after the artwork is saved, so the gallery can refresh. */
  onChanged: () => void;
  onMoveToTrash: (artwork: Artwork) => void;
  /** The gallery as shown: arrows and a strip move through it. */
  gallery?: {
    artworks: readonly ArtworkSummary[];
    onNavigate: (artworkId: string) => void;
  };
}

/** Arrows typed into a field keep moving the cursor. */
function isTypingTarget(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

type RecordState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; artwork: Artwork };

export function ArtworkRecordDialog({
  artworkId,
  isNew = false,
  onClose,
  onChanged,
  onMoveToTrash,
  gallery,
}: ArtworkRecordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<RecordState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(isNew);
  const [isUnsaved, setIsUnsaved] = useState(isNew);
  /** The field clicked in the label, focused when the form opens. */
  const [focusField, setFocusField] = useState<string | undefined>();
  const unit = useDimensionUnit();
  const hiddenFields = useHiddenFields();
  const formHandle = useRef<ArtworkFormHandle>(null);
  /** Where the user was going when asked about unsaved changes. */
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const navigation = useNavigation();

  /** Saves the open form; false when it needs fixing, which it shows. */
  async function saveForm(): Promise<boolean> {
    const saved = await formHandle.current?.saveChanges();
    if (!saved) return false;
    setState({ status: "ready", artwork: saved });
    setIsUnsaved(false);
    onChanged();
    return true;
  }

  /** Leaves the form without saving, asking first if it has changes. */
  function leaveForm(leave: () => void) {
    if (isEditing && formHandle.current?.isDirty()) {
      setPendingLeave(() => leave);
    } else {
      leave();
    }
  }

  /** Moves to another artwork, saving the open form first. */
  async function navigate(targetId: string) {
    if (!gallery) return;
    if (isEditing && !(await saveForm())) return;
    gallery.onNavigate(targetId);
  }

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.getArtwork(artworkId).then(
      (artwork) => isCurrent && setState({ status: "ready", artwork }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [artworkId]);

  return (
    <dialog
      ref={dialogRef}
      className="record"
      aria-label="Ficha de la obra"
      data-drop-target={dropTargetValue({ type: "artwork", id: artworkId })}
      data-drop-label={state.status === "ready" ? state.artwork.title : ""}
      // React passes on the close and cancel of dialogs opened inside.
      onClose={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => {
        // Arrows in a dialog opened inside, such as a confirmation, stay there.
        if (
          event.target instanceof Element &&
          event.target.closest("dialog") !== event.currentTarget
        )
          return;
        const step = navigationStep(event.key, {
          inField: isTypingTarget(event.target),
          alt: event.altKey,
          other: event.ctrlKey || event.metaKey || event.shiftKey,
        });
        if (!gallery || !step) return;
        const ids = gallery.artworks.map(({ id }) => id);
        const target = neighbourId(ids, artworkId, step);
        if (!target) return;
        event.preventDefault();
        void navigate(target);
      }}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        // Escape leaves edit mode first instead of closing the record.
        if (isEditing) {
          event.preventDefault();
          leaveForm(() => setIsEditing(false));
        }
      }}
    >
      <header className="record__toolbar">
        <Button onClick={() => leaveForm(() => dialogRef.current?.close())}>
          <ArrowLeft aria-hidden size={16} />
          Galería
        </Button>
        {state.status === "ready" && !isEditing && (
          <div className="record__actions">
            <Button
              className="record__favorite"
              aria-pressed={state.artwork.favorite}
              title="Las favoritas van primero en la galería"
              onClick={() => {
                const artwork = {
                  ...state.artwork,
                  favorite: !state.artwork.favorite,
                };
                void window.artGallery
                  .setFavorite(artwork.id, artwork.favorite)
                  .then(() => {
                    setState({ status: "ready", artwork });
                    onChanged();
                  });
              }}
            >
              <Star
                aria-hidden
                size={16}
                fill={state.artwork.favorite ? "currentColor" : "none"}
              />
              {state.artwork.favorite ? "Favorita" : "Marcar como favorita"}
            </Button>
            <Button onClick={() => onMoveToTrash(state.artwork)}>
              <Trash2 aria-hidden size={16} />
              Mover a la papelera
            </Button>
            <Button
              onClick={() => {
                setFocusField(undefined);
                setIsEditing(true);
              }}
            >
              <Pencil aria-hidden size={16} />
              Editar
            </Button>
          </div>
        )}
      </header>

      {state.status === "loading" && (
        <p className="record__status" role="status">
          Cargando ficha…
        </p>
      )}

      {state.status === "error" && (
        <p className="record__status" role="alert">
          No se pudo abrir la ficha de esta obra.
        </p>
      )}

      {state.status === "ready" && unit && (
        <div key={state.artwork.id} className="record__layout">
          <ImageViewer
            artwork={state.artwork}
            onArtworkChange={(artwork) => {
              setState({ status: "ready", artwork });
              onChanged();
            }}
          />
          <div className="record__panel">
            {isEditing ? (
              <ArtworkForm
                handle={formHandle}
                artwork={state.artwork}
                unit={unit}
                hiddenFields={hiddenFields}
                isUnsaved={isUnsaved}
                focusField={focusField}
                onCancel={() =>
                  isUnsaved ? onMoveToTrash(state.artwork) : setIsEditing(false)
                }
                onSaved={(artwork) => {
                  setState({ status: "ready", artwork });
                  setIsEditing(false);
                  setIsUnsaved(false);
                  onChanged();
                }}
              />
            ) : (
              <ArtworkLabel
                artwork={state.artwork}
                unit={unit}
                hiddenFields={hiddenFields}
                onEditField={(fieldLabel) => {
                  setFocusField(fieldLabel);
                  setIsEditing(true);
                }}
              />
            )}
            <ArtworkCollectionsField
              artworkId={state.artwork.id}
              onChanged={onChanged}
            />
            {/* Opening a document leaves for Documentación. */}
            <NavigationContext
              value={{
                ...navigation,
                showDocuments: (route) =>
                  leaveForm(() => navigation.showDocuments(route)),
              }}
            >
              <LinkedDocuments
                target={{ type: "artwork", id: state.artwork.id }}
                targetLabel={state.artwork.title}
              />
            </NavigationContext>
          </div>
        </div>
      )}

      {gallery && gallery.artworks.length > 1 && (
        <div className="record__carousel">
          <RecordCarousel
            artworks={gallery.artworks}
            currentId={artworkId}
            onNavigate={(id) => void navigate(id)}
          />
        </div>
      )}

      {pendingLeave && (
        <ConfirmDialog
          title="¿Guardar los cambios?"
          message="Hay cambios en la ficha que aún no se han guardado."
          cancelLabel="Seguir editando"
          confirmLabel="Descartar"
          onCancel={() => setPendingLeave(null)}
          onConfirm={() => {
            setPendingLeave(null);
            pendingLeave();
          }}
          alternative={{
            label: "Guardar",
            onClick: () => {
              setPendingLeave(null);
              void saveForm().then((saved) => saved && pendingLeave());
            },
          }}
        />
      )}
    </dialog>
  );
}
