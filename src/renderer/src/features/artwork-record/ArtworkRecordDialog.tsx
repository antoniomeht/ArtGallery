import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Artwork, ArtworkSummary } from "../../../../shared/artwork";
import { useDimensionUnit } from "../../hooks/useDimensionUnit";
import { ArtworkCollectionsField } from "../collections/ArtworkCollectionsField";
import { LinkedDocuments } from "../documents/LinkedDocuments";
import { ArtworkForm } from "./ArtworkForm";
import { ArtworkLabel } from "./ArtworkLabel";
import { ImageViewer } from "./ImageViewer";
import { RecordCarousel } from "./RecordCarousel";
import { neighbourId } from "./recordNavigation";
import { Button } from "../../components/Button";
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
      onClose={onClose}
      onKeyDown={(event) => {
        const step =
          event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        // While editing, moving away would lose what was typed.
        if (!gallery || !step || isEditing || isTypingTarget(event.target))
          return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          return;
        const ids = gallery.artworks.map(({ id }) => id);
        const target = neighbourId(ids, artworkId, step);
        if (!target) return;
        event.preventDefault();
        gallery.onNavigate(target);
      }}
      onCancel={(event) => {
        // Escape leaves edit mode first instead of closing the record.
        if (isEditing) {
          event.preventDefault();
          setIsEditing(false);
        }
      }}
    >
      <header className="record__toolbar">
        <Button onClick={() => dialogRef.current?.close()}>
          <ArrowLeft aria-hidden size={16} />
          Galería
        </Button>
        {state.status === "ready" && !isEditing && (
          <div className="record__actions">
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
                artwork={state.artwork}
                unit={unit}
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
            <LinkedDocuments
              target={{ type: "artwork", id: state.artwork.id }}
              targetLabel={state.artwork.title}
            />
          </div>
        </div>
      )}

      {gallery && gallery.artworks.length > 1 && (
        <div className="record__carousel" inert={isEditing}>
          <RecordCarousel
            artworks={gallery.artworks}
            currentId={artworkId}
            onNavigate={gallery.onNavigate}
          />
        </div>
      )}
    </dialog>
  );
}
