import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  CollectionSummary,
  DeletedCollection,
} from "../../../../shared/collection";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { collectionErrorMessage } from "./collectionErrors";
import "./collections.css";

interface ManageCollectionsDialogProps {
  collections: CollectionSummary[];
  onChanged: () => void;
  onDeleted: (deleted: DeletedCollection) => void;
  onClose: () => void;
}

/** Renames and deletes collections; deleting never touches the artworks. */
export function ManageCollectionsDialog({
  collections,
  onChanged,
  onDeleted,
  onClose,
}: ManageCollectionsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function rename(collection: CollectionSummary, name: string) {
    if (name.trim() === collection.name) return;
    try {
      await window.artGallery.renameCollection(collection.id, name);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(collectionErrorMessage(failure));
    }
  }

  async function remove(collection: CollectionSummary) {
    onDeleted(await window.artGallery.deleteCollection(collection.id));
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="manage-collections-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="manage-collections-title" className="dialog__title">
          Colecciones
        </h2>
        <p className="dialog__message">
          Eliminar una colección no elimina sus obras.
        </p>
        {collections.length === 0 && (
          <p className="dialog__message">No queda ninguna colección.</p>
        )}
        <ul className="manage-collections">
          {collections.map((collection) => (
            <li key={collection.id} className="manage-collections__row">
              <input
                className="field__input manage-collections__name"
                aria-label={`Nombre de «${collection.name}»`}
                defaultValue={collection.name}
                maxLength={100}
                onBlur={(event) => void rename(collection, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <span className="manage-collections__count">
                {collection.artworkCount === 1
                  ? "1 obra"
                  : `${collection.artworkCount} obras`}
              </span>
              <IconButton
                aria-label={`Eliminar «${collection.name}»`}
                onClick={() => void remove(collection)}
              >
                <Trash2 aria-hidden size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
        {error && (
          <p className="dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog__actions">
          <Button variant="primary" onClick={() => dialogRef.current?.close()}>
            Hecho
          </Button>
        </div>
      </div>
    </dialog>
  );
}
