/**
 * Accent- and case-insensitive form of a text, so "Ángel" sorts and matches
 * like "angel". Registered in SQLite as the `sort_key` function.
 */
export function sortKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}
