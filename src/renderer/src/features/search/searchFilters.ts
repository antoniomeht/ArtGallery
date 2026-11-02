import type { ArtworkQuery, ArtworkStatus } from "../../../../shared/artwork";

/** Filter values as the form holds them: empty strings mean "any". */
export interface SearchFilters {
  text: string;
  statuses: ArtworkStatus[];
  category: string;
  artist: string;
  technique: string;
  tag: string;
  location: string;
  yearFrom: string;
  yearTo: string;
}

export const EMPTY_FILTERS: SearchFilters = {
  text: "",
  statuses: [],
  category: "",
  artist: "",
  technique: "",
  tag: "",
  location: "",
  yearFrom: "",
  yearTo: "",
};

const optional = (value: string) => value.trim() || undefined;

/** A year field that is blank or not a whole number does not filter. */
const optionalYear = (value: string) =>
  /^-?\d{1,4}$/.test(value.trim()) ? Number(value) : undefined;

export function toArtworkQuery(filters: SearchFilters): ArtworkQuery {
  return {
    text: optional(filters.text),
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
    category: optional(filters.category),
    artist: optional(filters.artist),
    technique: optional(filters.technique),
    tag: optional(filters.tag),
    location: optional(filters.location),
    yearFrom: optionalYear(filters.yearFrom),
    yearTo: optionalYear(filters.yearTo),
  };
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return Object.values(toArtworkQuery(filters)).some(
    (value) => value !== undefined,
  );
}
