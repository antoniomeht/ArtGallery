import { CheckSquare, Plus } from "lucide-react";
import type { ArtworkSort } from "../../../../shared/artwork";

const SORT_LABELS: Record<ArtworkSort, string> = {
  recent: "Añadidas recientemente",
  oldest: "Añadidas hace más tiempo",
  title: "Título (A–Z)",
  "year-asc": "Año (más antiguas primero)",
  "year-desc": "Año (más recientes primero)",
};

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
      <label className="toolbar__sort">
        <span className="visually-hidden">Ordenar por</span>
        <select
          className="field__input"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ArtworkSort)}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
