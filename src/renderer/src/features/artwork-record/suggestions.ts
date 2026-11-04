const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Lower is closer: same text, then its start, a word's start, anywhere. */
function matchScore(value: string, term: string): number | null {
  if (value === term) return 0;
  if (value.startsWith(term)) return 1;
  if (value.split(/\s+/).some((word) => word.startsWith(term))) return 2;
  return value.includes(term) ? 3 : null;
}

/**
 * The values that match `term`, closest first and otherwise in their given
 * order. Accents and case do not matter; an empty term matches everything.
 */
export function rankSuggestions(
  term: string,
  values: readonly string[],
): string[] {
  const normalizedTerm = normalize(term);
  return values
    .map((value) => ({
      value,
      score: matchScore(normalize(value), normalizedTerm),
    }))
    .filter(({ score }) => score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .map(({ value }) => value);
}

/** Adds to `values` the defaults they do not already have. */
export function withDefaults(
  values: readonly string[],
  defaults: readonly string[],
): string[] {
  const existing = new Set(values.map(normalize));
  return [
    ...values,
    ...defaults.filter((value) => !existing.has(normalize(value))),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

const parts = (text: string) => text.split(",");

/** What is being typed: the whole text, or in a list what follows the last comma. */
export function currentTerm(text: string, isList: boolean): string {
  return isList ? (parts(text).at(-1) ?? "") : text;
}

/** Values already written in a list, which should not be offered again. */
export function otherListValues(text: string): string[] {
  return parts(text)
    .slice(0, -1)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The text with what is being typed replaced by the chosen value. */
export function applySuggestion(
  text: string,
  value: string,
  isList: boolean,
): string {
  return isList ? [...otherListValues(text), value, ""].join(", ") : value;
}

export function isSameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
