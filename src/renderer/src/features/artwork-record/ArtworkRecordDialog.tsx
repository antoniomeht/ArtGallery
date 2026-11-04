import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "../../../../shared/artwork";
import { ArtworkForm } from "./ArtworkForm";
import { ArtworkLabel } from "./ArtworkLabel";
import { ImageViewer } from "./ImageViewer";
import { Button } from "../../components/Button";
import "./ArtworkRecordDialog.css";

interface ArtworkRecordDialogProps {
  artworkId: string;
  onClose: () => void;
  /** Called after the artwork is saved, so the gallery can refresh. */
  onChanged: () => void;
  onMoveToTrash: (artwork: Artwork) => void;
}

type RecordState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; artwork: Artwork };

export function ArtworkRecordDialog({
  artworkId,
  onClose,
  onChanged,
  onMoveToTrash,
}: ArtworkRecordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<RecordState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(false);

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
      onClose={onClose}
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
            <Button onClick={() => setIsEditing(true)}>
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

      {state.status === "ready" && (
        <div className="record__layout">
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
                onCancel={() => setIsEditing(false)}
                onSaved={(artwork) => {
                  setState({ status: "ready", artwork });
                  setIsEditing(false);
                  onChanged();
                }}
              />
            ) : (
              <ArtworkLabel artwork={state.artwork} />
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
