import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { CollectionSummary } from "../../../../shared/collection";
import { useCollections } from "../../hooks/useCollections";
import { collectionErrorMessage, sameName } from "./collectionErrors";
import "./collections.css";

interface ArtworkCollectionsFieldProps {
  artworkId: string;
  onChanged: () => void;
}

/** The collections of one artwork; changes are saved at once. */
export function ArtworkCollectionsField({
  artworkId,
  onChanged,
}: ArtworkCollectionsFieldProps) {
  const inputId = useId();
  const listId = useId();
  const [version, setVersion] = useState(0);
  const { collections: all } = useCollections(version);
  const [own, setOwn] = useState<CollectionSummary[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listArtworkCollections(artworkId)
      .then((list) => isCurrent && setOwn(list));
    return () => {
      isCurrent = false;
    };
  }, [artworkId, version]);

  function changed() {
    setVersion((current) => current + 1);
    onChanged();
  }

  async function add() {
    if (!name.trim()) return;
    try {
      const existing = all.find((collection) =>
        sameName(collection.name, name),
      );
      const target =
        existing ?? (await window.artGallery.createCollection(name));
      await window.artGallery.setCollectionMembership(
        target.id,
        [artworkId],
        true,
      );
      setName("");
      setError(null);
      changed();
    } catch (failure) {
      setError(collectionErrorMessage(failure));
    }
  }

  async function remove(collection: CollectionSummary) {
    await window.artGallery.setCollectionMembership(
      collection.id,
      [artworkId],
      false,
    );
    changed();
  }

  const available = all.filter(
    (collection) => !own.some(({ id }) => id === collection.id),
  );

  return (
    <div className="field artwork-collections">
      <label className="field__label" htmlFor={inputId}>
        Colecciones
      </label>
      <div className="chip-input">
        {own.map((collection) => (
          <span key={collection.id} className="chip-input__chip">
            {collection.name}
            <button
              type="button"
              className="chip-input__remove"
              aria-label={`Quitar de «${collection.name}»`}
              onClick={() => void remove(collection)}
            >
              <X aria-hidden size={12} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="chip-input__input"
          list={listId}
          placeholder="Añadir…"
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
        />
        <datalist id={listId}>
          {available.map((collection) => (
            <option key={collection.id} value={collection.name} />
          ))}
        </datalist>
      </div>
      <p className="field__hint">
        Escribe para elegir una colección o crear una nueva, y pulsa Intro.
      </p>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
