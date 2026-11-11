/** The field after `current`, or null on the last one. */
export function nextField<T>(fields: readonly T[], current: T): T | null {
  const index = fields.indexOf(current);
  if (index === -1) return null;
  return fields[index + 1] ?? null;
}
