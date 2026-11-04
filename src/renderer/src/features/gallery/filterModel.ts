import type {
  ArtworkQuery,
  ArtworkStatus,
  FilterOptions,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";

type ValueFilterKey = Exclude<keyof FilterOptions, "supports">;

/** Filter values as the page holds them: empty means "any". */
export interface GalleryFilters extends Record<ValueFilterKey, string[]> {
  text: string;
  statuses: ArtworkStatus[];
  yearFrom: string;
  yearTo: string;
}

/** Filters chosen from the values that exist in the inventory. */
export const VALUE_FILTERS: { key: ValueFilterKey; label: string }[] = [
  { key: "categories", label: "Categoría" },
  { key: "artists", label: "Artista" },
  { key: "techniques", label: "Técnica" },
  { key: "tags", label: "Etiqueta" },
  { key: "locations", label: "Ubicación" },
];

export const EMPTY_FILTERS: GalleryFilters = {
  text: "",
  statuses: [],
  categories: [],
  artists: [],
  techniques: [],
  tags: [],
  locations: [],
  yearFrom: "",
  yearTo: "",
};

const optionalList = <T>(values: T[]) =>
  values.length > 0 ? values : undefined;

/** A year field that is blank or not a whole number does not filter. */
const optionalYear = (value: string) =>
  /^-?\d{1,4}$/.test(value.trim()) ? Number(value) : undefined;

export function toArtworkQuery(filters: GalleryFilters): ArtworkQuery {
  return {
    text: filters.text.trim() || undefined,
    statuses: optionalList(filters.statuses),
    categories: optionalList(filters.categories),
    artists: optionalList(filters.artists),
    techniques: optionalList(filters.techniques),
    tags: optionalList(filters.tags),
    locations: optionalList(filters.locations),
    yearFrom: optionalYear(filters.yearFrom),
    yearTo: optionalYear(filters.yearTo),
  };
}

export function hasActiveFilters(filters: GalleryFilters): boolean {
  return Object.values(toArtworkQuery(filters)).some(
    (value) => value !== undefined,
  );
}

/** One chosen value, shown as a bubble that can be removed. */
export interface FilterBubble {
  id: string;
  filterLabel: string;
  label: string;
  /** The filters once this value is removed. */
  without: GalleryFilters;
}

/** Bubbles for everything chosen. The search text has its own field. */
export function filterBubbles(filters: GalleryFilters): FilterBubble[] {
  const statuses = filters.statuses.map((status) => ({
    id: `status:${status}`,
    filterLabel: "Estado",
    label: STATUS_LABELS[status],
    without: {
      ...filters,
      statuses: filters.statuses.filter((item) => item !== status),
    },
  }));
  const values = VALUE_FILTERS.flatMap(({ key, label: filterLabel }) =>
    filters[key].map((value) => ({
      id: `${key}:${value}`,
      filterLabel,
      label: value,
      without: {
        ...filters,
        [key]: filters[key].filter((item) => item !== value),
      },
    })),
  );
  const from = optionalYear(filters.yearFrom);
  const to = optionalYear(filters.yearTo);
  const years =
    from === undefined && to === undefined
      ? []
      : [
          {
            id: "year",
            filterLabel: "Año",
            label: `${from ?? "…"}–${to ?? "…"}`,
            without: { ...filters, yearFrom: "", yearTo: "" },
          },
        ];
  return [...statuses, ...values, ...years];
}
