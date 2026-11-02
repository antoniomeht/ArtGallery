import { CheckSquare, Plus } from "lucide-react";
import type { ArtworkSort } from "../../../../shared/artwork";
import { SortSelect } from "./SortSelect";

interface GalleryToolbarProps {
  sort: ArtworkSort;
  onSortChange: (sort: ArtworkSort) => void;
  onSelect: () => void;
  onAdd: () => void;
}

export function GalleryToolbar({
  sort,
  onSortChange,
  onSelect,
  onAdd,
}: GalleryToolbarProps) {
  return (
    <div className="toolbar">
      <SortSelect value={sort} onChange={onSortChange} />
      <button type="button" className="button" onClick={onSelect}>
        <CheckSquare aria-hidden size={16} />
        Seleccionar
      </button>
      <button type="button" className="button button--primary" onClick={onAdd}>
        <Plus aria-hidden size={18} />
        Añadir obra
      </button>
    </div>
  );
}
