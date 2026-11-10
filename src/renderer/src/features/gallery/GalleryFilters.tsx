import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  ARTWORK_STATUSES,
  type FilterOptions,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import type { CollectionSummary } from "../../../../shared/collection";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { CollectionChips } from "../collections/CollectionChips";
import { CollectionDocumentsLink } from "../collections/CollectionDocumentsLink";
import { FilterDropdown } from "./FilterDropdown";
import {
  EMPTY_FILTERS,
  filterBubbles,
  VALUE_FILTERS,
  type GalleryFilters as Filters,
} from "./filterModel";
import "./GalleryFilters.css";

interface GalleryFiltersProps {
  filters: Filters;
  options: FilterOptions | null;
  collections: CollectionSummary[];
  onChange: (filters: Filters) => void;
  onManageCollections: () => void;
}

/** With a single value in the inventory there is nothing to choose between. */
const MIN_OPTIONS_TO_FILTER = 2;

function toggled<T>(values: readonly T[], value: T, isChecked: boolean): T[] {
  return isChecked
    ? [...values, value]
    : values.filter((item) => item !== value);
}

function CheckboxList<T extends string>({
  values,
  chosen,
  labelOf,
  onChange,
}: {
  values: readonly T[];
  chosen: readonly T[];
  labelOf: (value: T) => string;
  onChange: (chosen: T[]) => void;
}) {
  return values.map((value) => (
    <label key={value} className="checkbox filter-panel__option">
      <input
        type="checkbox"
        checked={chosen.includes(value)}
        onChange={(event) =>
          onChange(toggled(chosen, value, event.target.checked))
        }
      />
      {labelOf(value)}
    </label>
  ));
}

export function GalleryFilters({
  filters,
  options,
  collections,
  onChange,
  onManageCollections,
}: GalleryFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const collectionNames = new Map(
    collections.map(({ id, name }) => [id, name]),
  );
  const bubbles = filterBubbles(filters, collectionNames);
  const update = (changes: Partial<Filters>) =>
    onChange({ ...filters, ...changes });

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const isFind =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
      if (isFind && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <div className="gallery-filters">
      <div className="gallery-filters__bar">
        <label className="gallery-search">
          <Search aria-hidden size={16} className="gallery-search__icon" />
          <span className="visually-hidden">Buscar en la galería</span>
          <input
            ref={searchRef}
            type="search"
            className="field__input gallery-search__input"
            value={filters.text}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Buscar por título, técnica, colección…"
          />
        </label>

        <FilterDropdown label="Estado" count={filters.statuses.length}>
          <CheckboxList
            values={ARTWORK_STATUSES}
            chosen={filters.statuses}
            labelOf={(status) => STATUS_LABELS[status]}
            onChange={(statuses) => update({ statuses })}
          />
        </FilterDropdown>

        {collections.length > 0 && (
          <FilterDropdown label="Colección" count={filters.collections.length}>
            <CheckboxList
              values={collections.map(({ id }) => id)}
              chosen={filters.collections}
              labelOf={(id) => collectionNames.get(id) ?? id}
              onChange={(chosen) => update({ collections: chosen })}
            />
          </FilterDropdown>
        )}

        {VALUE_FILTERS.map(({ key, label }) => {
          const values = options?.[key] ?? [];
          if (
            values.length < MIN_OPTIONS_TO_FILTER &&
            filters[key].length === 0
          ) {
            return null;
          }
          return (
            <FilterDropdown key={key} label={label} count={filters[key].length}>
              <CheckboxList
                values={values}
                chosen={filters[key]}
                labelOf={(value) => value}
                onChange={(chosen) => update({ [key]: chosen })}
              />
            </FilterDropdown>
          );
        })}

        <FilterDropdown
          label="Año"
          count={filters.yearFrom || filters.yearTo ? 1 : 0}
          showCount={false}
        >
          <div className="filter-panel__years">
            <Field
              label="Desde"
              inputMode="numeric"
              value={filters.yearFrom}
              onChange={(yearFrom) => update({ yearFrom })}
            />
            <Field
              label="Hasta"
              inputMode="numeric"
              value={filters.yearTo}
              onChange={(yearTo) => update({ yearTo })}
            />
          </div>
        </FilterDropdown>
      </div>

      <CollectionChips
        collections={collections}
        activeIds={filters.collections}
        onToggle={(id) =>
          update({
            collections: toggled(
              filters.collections,
              id,
              !filters.collections.includes(id),
            ),
          })
        }
        onManage={onManageCollections}
      />
      {filters.collections.length === 1 && (
        <CollectionDocumentsLink
          collectionId={filters.collections[0]!}
          name={collectionNames.get(filters.collections[0]!) ?? ""}
        />
      )}

      {bubbles.length > 0 && (
        <ul className="filter-bubbles" aria-label="Filtros aplicados">
          {bubbles.map(({ id, filterLabel, label, without }) => (
            <li key={id} className="filter-bubble">
              {label}
              <button
                type="button"
                className="filter-bubble__remove"
                aria-label={`Quitar ${filterLabel}: ${label}`}
                onClick={() => onChange(without)}
              >
                <X aria-hidden size={14} />
              </button>
            </li>
          ))}
          <li>
            <Button
              variant="subtle"
              onClick={() => onChange({ ...EMPTY_FILTERS, text: filters.text })}
            >
              Limpiar todo
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
}
