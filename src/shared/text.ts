/** Text as compared in searches: no accents, no capitals, no outer spaces. */
export const foldText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
