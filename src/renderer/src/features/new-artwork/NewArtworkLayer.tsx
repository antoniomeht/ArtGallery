import { ActionNotice } from "../../components/ActionNotice";
import { ArtworkRecordDialog } from "../artwork-record/ArtworkRecordDialog";
import { CreationProgressDialog } from "./CreationProgressDialog";
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
      {newArtworks.progress && (
        <CreationProgressDialog progress={newArtworks.progress} />
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
