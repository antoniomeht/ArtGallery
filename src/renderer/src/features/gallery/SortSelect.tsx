import type { ArtworkSort } from "../../../../shared/artwork";

/** "title" is left out: it only orders lists for picking an artwork. */
const SORT_LABELS: Partial<Record<ArtworkSort, string>> = {
  "year-desc": "Año (más recientes primero)",
  "year-asc": "Año (más antiguas primero)",
  technique: "Técnica",
  recent: "Añadidas recientemente",
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
