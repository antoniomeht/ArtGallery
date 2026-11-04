import { ImagePlus } from "lucide-react";
import { ActionNotice } from "../../components/ActionNotice";
import { ArtworkRecordDialog } from "../artwork-record/ArtworkRecordDialog";
import type { useNewArtworks } from "./useNewArtworks";
import "./NewArtworkLayer.css";

interface NewArtworkLayerProps {
  newArtworks: ReturnType<typeof useNewArtworks>;
}

/** What adding artworks shows over any section. */
export function NewArtworkLayer({ newArtworks }: NewArtworkLayerProps) {
  const { editingId, closeEditing, moveToTrash, notice, setNotice, refresh } =
    newArtworks;

  return (
    <>
      {newArtworks.isDragging && (
        <div className="drop-overlay">
          <ImagePlus aria-hidden size={32} />
          <strong className="drop-overlay__title">
            Suelta para añadir a la Galería
          </strong>
          <span>JPG, PNG, WebP o TIFF</span>
        </div>
      )}
      {editingId && (
        <ArtworkRecordDialog
          artworkId={editingId}
          isNew
          onClose={closeEditing}
          onChanged={refresh}
          onMoveToTrash={(artwork) => {
            closeEditing();
            void moveToTrash(
              [artwork.id],
              `«${artwork.title}» se ha movido a la papelera.`,
            );
          }}
        />
      )}
      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}
