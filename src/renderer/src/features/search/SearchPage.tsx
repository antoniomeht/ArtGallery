import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ARTWORK_STATUSES,
  type ArtworkSort,
  type FilterOptions,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { ActionNotice } from "../../components/ActionNotice";
import { useActionNotice } from "../../hooks/useActionNotice";
import { useArtworkList } from "../../hooks/useArtworkList";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ArtworkRecordDialog } from "../artwork-record/ArtworkRecordDialog";
import { GalleryGrid } from "../gallery/GalleryGrid";
import { SortSelect } from "../gallery/SortSelect";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  toArtworkQuery,
  type SearchFilters,
} from "./searchFilters";
import "./SearchPage.css";
import { Button } from "../../components/Button";

/** Filters chosen from the values that exist in the inventory. */
const SELECT_FILTERS: {
  key: "category" | "artist" | "technique" | "tag" | "location";
  label: string;
  options: keyof FilterOptions;
}[] = [
  { key: "category", label: "Categoría", options: "categories" },
  { key: "artist", label: "Artista", options: "artists" },
  { key: "technique", label: "Técnica", options: "techniques" },
  { key: "tag", label: "Etiqueta", options: "tags" },
  { key: "location", label: "Ubicación", options: "locations" },
];

export function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<ArtworkSort>("recent");
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [openArtworkId, setOpenArtworkId] = useState<string | null>(null);
  // Typing should not query the database on every keystroke.
  const query = useDebouncedValue(filters, 250);

  const search = useCallback(
    () => window.artGallery.listArtworks({ ...toArtworkQuery(query), sort }),
    [query, sort],
  );
  const { state, reload } = useArtworkList(search);
  const { notice, setNotice, moveToTrash } = useActionNotice(reload);

  const loadOptions = useCallback(() => {
    void window.artGallery.listFilterOptions().then(setOptions);
  }, []);
  useEffect(loadOptions, [loadOptions]);

  const update = (changes: Partial<SearchFilters>) =>
    setFilters((current) => ({ ...current, ...changes }));

  const results = state.status === "ready" ? state.artworks : [];

  return (
    <section className="search-page" aria-labelledby="search-title">
      <header className="page-header">
        <h1 id="search-title" className="page-header__title">
          Búsqueda y filtros
        </h1>
      </header>

      <div className="search-panel">
        <label className="search-box">
          <Search aria-hidden size={20} className="search-box__icon" />
          <span className="visually-hidden">Buscar</span>
          <input
            type="search"
            className="search-box__input"
            value={filters.text}
            onChange={(event) => update({ text: event.target.value })}
            placeholder="Título, artista, técnica, etiqueta, notas…"
            autoFocus
          />
        </label>

        <div className="search-filters">
          {SELECT_FILTERS.map(({ key, label, options: optionsKey }) => (
            <label key={key} className="field">
              <span className="field__label">{label}</span>
              <select
                className="field__input"
                value={filters[key]}
                onChange={(event) => update({ [key]: event.target.value })}
              >
                <option value="">Cualquiera</option>
                {options?.[optionsKey].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <fieldset className="search-filters__group">
            <legend className="field__label">Año</legend>
            <div className="search-filters__years">
              <input
                className="field__input"
                inputMode="numeric"
                aria-label="Desde el año"
                placeholder="Desde"
                value={filters.yearFrom}
                onChange={(event) => update({ yearFrom: event.target.value })}
              />
              <input
                className="field__input"
                inputMode="numeric"
                aria-label="Hasta el año"
                placeholder="Hasta"
                value={filters.yearTo}
                onChange={(event) => update({ yearTo: event.target.value })}
              />
            </div>
          </fieldset>

          <fieldset className="search-filters__group search-filters__statuses">
            <legend className="field__label">Estado</legend>
            {ARTWORK_STATUSES.map((status) => (
              <label key={status} className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(status)}
                  onChange={(event) =>
                    update({
                      statuses: event.target.checked
                        ? [...filters.statuses, status]
                        : filters.statuses.filter((item) => item !== status),
                    })
                  }
                />
                {STATUS_LABELS[status]}
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="search-results__bar">
        <p className="search-results__count" aria-live="polite">
          {state.status === "ready" &&
            (results.length === 1
              ? "1 obra encontrada"
              : `${results.length} obras encontradas`)}
        </p>
        {hasActiveFilters(filters) && (
          <Button onClick={() => setFilters(EMPTY_FILTERS)}>
            <X aria-hidden size={16} />
            Limpiar filtros
          </Button>
        )}
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {state.status === "error" && (
        <p className="search-results__status" role="alert">
          No se pudo completar la búsqueda.
        </p>
      )}
      {state.status === "ready" && results.length === 0 && (
        <p className="search-results__status">
          Ninguna obra coincide con la búsqueda. Prueba con menos filtros o con
          otras palabras.
        </p>
      )}
      {results.length > 0 && (
        <GalleryGrid
          artworks={results}
          selectedIds={null}
          onOpen={setOpenArtworkId}
        />
      )}

      {openArtworkId && (
        <ArtworkRecordDialog
          artworkId={openArtworkId}
          onClose={() => setOpenArtworkId(null)}
          onChanged={() => {
            reload();
            loadOptions();
          }}
          onMoveToTrash={(artwork) => {
            setOpenArtworkId(null);
            void moveToTrash(
              [artwork.id],
              `«${artwork.title}» se ha movido a la papelera.`,
            );
          }}
        />
      )}

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}
