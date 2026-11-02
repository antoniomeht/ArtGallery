import type { SQLInputValue } from "node:sqlite";
import type { ArtworkFilter } from "../../shared/artwork";
import { sortKey } from "../database/sortKey";

export interface SqlCondition {
  sql: string;
  params: SQLInputValue[];
}

/** Columns of `artworks a` searched by free text, besides the tags. */
const TEXT_COLUMNS = [
  "title",
  "artist",
  "category",
  "technique",
  "support",
  "description",
  "notes",
  "location",
];

/** Filters that match one column exactly, ignoring accents and case. */
const EXACT_FILTERS = {
  category: "a.category",
  artist: "a.artist",
  technique: "a.technique",
  location: "a.location",
} as const;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/**
 * Turns a filter into SQL conditions over `artworks a`, all of which must
 * hold. Every value travels as a parameter, never inside the SQL text.
 */
export function buildFilterConditions(filter: ArtworkFilter): SqlCondition[] {
  const conditions: SqlCondition[] = [];

  // Each word must appear in some field: "óleo marina" finds a seascape in oil.
  for (const word of filter.text?.split(/\s+/).filter(Boolean) ?? []) {
    const pattern = `%${escapeLike(sortKey(word) ?? "")}%`;
    const columns = TEXT_COLUMNS.map(
      (column) => `sort_key(a.${column}) LIKE ? ESCAPE '\\'`,
    );
    conditions.push({
      sql: `(${columns.join(" OR ")} OR EXISTS (
        SELECT 1 FROM artwork_tags t
        WHERE t.artwork_id = a.id AND sort_key(t.tag) LIKE ? ESCAPE '\\'))`,
      params: Array<string>(TEXT_COLUMNS.length + 1).fill(pattern),
    });
  }

  for (const [key, column] of Object.entries(EXACT_FILTERS)) {
    const value = filter[key as keyof typeof EXACT_FILTERS];
    if (value) {
      conditions.push({
        sql: `sort_key(${column}) = sort_key(?)`,
        params: [value],
      });
    }
  }

  if (filter.tag) {
    conditions.push({
      sql: `EXISTS (SELECT 1 FROM artwork_tags t
             WHERE t.artwork_id = a.id AND sort_key(t.tag) = sort_key(?))`,
      params: [filter.tag],
    });
  }

  if (filter.statuses?.length) {
    conditions.push({
      sql: `a.status IN (${filter.statuses.map(() => "?").join(", ")})`,
      params: [...filter.statuses],
    });
  }

  if (filter.yearFrom != null) {
    conditions.push({ sql: "a.year >= ?", params: [filter.yearFrom] });
  }
  if (filter.yearTo != null) {
    conditions.push({ sql: "a.year <= ?", params: [filter.yearTo] });
  }

  return conditions;
}
