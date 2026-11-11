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
  "inventory_number",
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
  categories: "a.category",
  artists: "a.artist",
  techniques: "a.technique",
  locations: "a.location",
} as const;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/** `(sort_key(?), sort_key(?), ...)` with one placeholder per value. */
const sortKeyList = (values: readonly string[]) =>
  `(${values.map(() => "sort_key(?)").join(", ")})`;

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
        WHERE t.artwork_id = a.id AND sort_key(t.tag) LIKE ? ESCAPE '\\')
        OR EXISTS (
        SELECT 1 FROM collection_artworks ca
        JOIN collections c ON c.id = ca.collection_id
        WHERE ca.artwork_id = a.id AND sort_key(c.name) LIKE ? ESCAPE '\\'))`,
      params: Array<string>(TEXT_COLUMNS.length + 2).fill(pattern),
    });
  }

  for (const [key, column] of Object.entries(EXACT_FILTERS)) {
    const values = filter[key as keyof typeof EXACT_FILTERS];
    if (values?.length) {
      conditions.push({
        sql: `sort_key(${column}) IN ${sortKeyList(values)}`,
        params: [...values],
      });
    }
  }

  if (filter.tags?.length) {
    conditions.push({
      sql: `EXISTS (SELECT 1 FROM artwork_tags t
             WHERE t.artwork_id = a.id
               AND sort_key(t.tag) IN ${sortKeyList(filter.tags)})`,
      params: [...filter.tags],
    });
  }

  if (filter.collections?.length) {
    const placeholders = filter.collections.map(() => "?").join(", ");
    conditions.push({
      sql: `EXISTS (SELECT 1 FROM collection_artworks ca
             WHERE ca.artwork_id = a.id AND ca.collection_id IN (${placeholders}))`,
      params: [...filter.collections],
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
