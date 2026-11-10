import type { CollectionSummary } from "../../../../shared/collection";
import { dropTargetValue } from "../drop/dropRouter";
import "./CollectionChips.css";

interface CollectionChipsProps {
  collections: CollectionSummary[];
  activeIds: readonly string[];
  onToggle: (id: string) => void;
  onManage: () => void;
}

/** One click filters by a collection; another click removes the filter. */
export function CollectionChips({
  collections,
  activeIds,
  onToggle,
  onManage,
}: CollectionChipsProps) {
  if (collections.length === 0) return null;

  return (
    <div className="collection-chips" role="group" aria-label="Colecciones">
      <span className="collection-chips__label" aria-hidden>
        Colecciones
      </span>
      {collections.map(({ id, name, artworkCount }) => (
        <button
          key={id}
          type="button"
          className="collection-chip"
          aria-pressed={activeIds.includes(id)}
          data-drop-target={dropTargetValue({ type: "collection", id })}
          data-drop-label={name}
          onClick={() => onToggle(id)}
        >
          {name}
          <span className="collection-chip__count">{artworkCount}</span>
        </button>
      ))}
      <button
        type="button"
        className="collection-chips__manage"
        onClick={onManage}
      >
        Gestionar
      </button>
    </div>
  );
}
