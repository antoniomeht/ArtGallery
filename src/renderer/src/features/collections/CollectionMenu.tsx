import { FolderPlus } from "lucide-react";
import { useId, useState, type CSSProperties, type FormEvent } from "react";
import type { CollectionSummary } from "../../../../shared/collection";
import { collectionErrorMessage } from "./collectionErrors";
import { membershipState, type Membership } from "./membership";
import "./collections.css";

interface CollectionMenuProps {
  collections: CollectionSummary[];
  selectedIds: readonly string[];
  disabled: boolean;
  /** Collections or their artworks changed. */
  onChanged: () => void;
}

/** Adds the selection to collections or removes it; each change is immediate. */
export function CollectionMenu({
  collections,
  selectedIds,
  disabled,
  onChanged,
}: CollectionMenuProps) {
  const id = useId();
  const anchor = `--collections-${id.replace(/\W/g, "")}`;
  const [memberships, setMemberships] = useState<Map<string, Membership>>(
    new Map(),
  );
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadMemberships(list = collections) {
    const entries = await Promise.all(
      list.map(async (collection) => {
        const members = await window.artGallery.listArtworks({
          collections: [collection.id],
        });
        const memberIds = new Set(members.map((artwork) => artwork.id));
        return [
          collection.id,
          membershipState(selectedIds, memberIds),
        ] as const;
      }),
    );
    setMemberships(new Map(entries));
  }

  async function toggle(collectionId: string) {
    const isMember = memberships.get(collectionId)?.state === "all";
    await window.artGallery.setCollectionMembership(
      collectionId,
      [...selectedIds],
      !isMember,
    );
    await loadMemberships();
    onChanged();
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await window.artGallery.createCollection(newName);
      await window.artGallery.setCollectionMembership(
        created.id,
        [...selectedIds],
        true,
      );
      setNewName("");
      setError(null);
      await loadMemberships([...collections, created]);
      onChanged();
    } catch (failure) {
      setError(collectionErrorMessage(failure));
    }
  }

  const count = selectedIds.length;

  return (
    <>
      <button
        type="button"
        className="button"
        disabled={disabled}
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        <FolderPlus aria-hidden size={16} />
        Añadir a colección…
      </button>
      <div
        id={id}
        popover="auto"
        className="filter-panel collection-menu"
        style={{ positionAnchor: anchor } as CSSProperties}
        onToggle={(event) => {
          if (event.newState === "open") void loadMemberships();
        }}
      >
        <p className="collection-menu__hint">
          Marca dónde van {count === 1 ? "la obra" : `las ${count} obras`}
        </p>
        {collections.map((collection) => {
          const membership = memberships.get(collection.id);
          return (
            <label
              key={collection.id}
              className="checkbox filter-panel__option"
            >
              <input
                type="checkbox"
                checked={membership?.state === "all"}
                ref={(input) => {
                  if (input) input.indeterminate = membership?.state === "some";
                }}
                onChange={() => void toggle(collection.id)}
              />
              {collection.name}
              {membership?.state === "some" && (
                <span className="collection-menu__partial">
                  {membership.count} de {count}
                </span>
              )}
            </label>
          );
        })}
        <form className="collection-menu__new" onSubmit={create}>
          <input
            className="field__input"
            aria-label="Nombre de la colección nueva"
            placeholder="Nueva colección…"
            maxLength={100}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="submit"
            className="button button--primary"
            disabled={!newName.trim()}
          >
            Crear
          </button>
        </form>
        {error && (
          <p className="dialog__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
