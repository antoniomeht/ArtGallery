import type { ArtworkSort } from "../../../../shared/artwork";

const SORT_LABELS: Record<ArtworkSort, string> = {
  recent: "Añadidas recientemente",
  oldest: "Añadidas hace más tiempo",
  title: "Título (A–Z)",
  "year-asc": "Año (más antiguas primero)",
  "year-desc": "Año (más recientes primero)",
};

interface SortSelectProps {
  value: ArtworkSort;
  onChange: (sort: ArtworkSort) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <label className="sort-select">
      <span className="visually-hidden">Ordenar por</span>
      <select
        className="field__input"
        value={value}
        onChange={(event) => onChange(event.target.value as ArtworkSort)}
      >
        {Object.entries(SORT_LABELS).map(([sort, label]) => (
          <option key={sort} value={sort}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
