/** IPC errors arrive wrapped in text; the service names a taken name this way. */
export function collectionErrorMessage(error: unknown): string {
  return String(error).includes("Collection name taken")
    ? "Ya existe una colección con ese nombre."
    : "No se pudo guardar la colección.";
}

/** Compares names as the database does: ignoring case and accents. */
export const sameName = (a: string, b: string) => nameKey(a) === nameKey(b);

const nameKey = (name: string) =>
  name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
