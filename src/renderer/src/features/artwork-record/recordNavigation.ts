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

interface KeyContext {
  /** Typing in a field, where bare arrows move the cursor. */
  inField: boolean;
  alt: boolean;
  /** Ctrl, Shift or Cmd, kept for other shortcuts. */
  other: boolean;
}

/** 1 or -1 when the key moves to the next or previous artwork, else 0. */
export function navigationStep(
  key: string,
  { inField, alt, other }: KeyContext,
): 1 | -1 | 0 {
  if (other || alt !== inField) return 0;
  return key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
}
