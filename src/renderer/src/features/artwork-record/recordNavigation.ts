/**
 * The artwork `step` places away from `currentId` in the gallery order, or
 * null past either end or when the artwork is no longer listed.
 */
export function neighbourId(
  ids: readonly string[],
  currentId: string,
  step: 1 | -1,
): string | null {
  const index = ids.indexOf(currentId);
  if (index === -1) return null;
  return ids[index + step] ?? null;
}
