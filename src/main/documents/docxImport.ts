import mammoth from "mammoth";

/**
 * Keeps an image found in the Word file and returns the address the editor
 * will show it from, or null to leave it out (e.g. a format it cannot show).
 */
export type StoreImage = (
  buffer: Buffer,
  contentType: string,
) => Promise<string | null>;

const escapeAttribute = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Plain text of an HTML fragment produced by mammoth (entities kept). */
const plainText = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/**
 * Turns mammoth's notes ("[1]" and a list at the end) into the editor's
 * footnotes, and the lines of a Word index into the editor's own index.
 */
export function adaptWordHtml(html: string): string {
  const notes = new Map<string, string>();
  let adapted = html.replace(
    /<li id="footnote-(\d+)">([\s\S]*?)<\/li>/g,
    (_match, id: string, body: string) => {
      const text = plainText(
        body.replace(/<a href="#footnote-ref-\d+">[^<]*<\/a>/g, ""),
      );
      notes.set(id, text);
      return "";
    },
  );
  adapted = adapted
    .replace(
      /<sup><a href="#footnote-(\d+)" id="footnote-ref-\d+">\[\d+\]<\/a><\/sup>/g,
      (_match, id: string) =>
        `<sup data-footnote="" data-text="${escapeAttribute(notes.get(id) ?? "")}"></sup>`,
    )
    .replace(/<ol>\s*<\/ol>/g, "")
    .replace(
      /(?:<p><a href="#_Toc[^"]*">[^<]*<\/a><\/p>)+/,
      '<nav data-table-of-contents=""></nav>',
    )
    .replace(/<p><a href="#_Toc[^"]*">[^<]*<\/a><\/p>/g, "");
  // Images it could not keep are left out instead of showing as broken.
  return adapted.replace(/<img [^>]*src=""[^>]*\/?>/g, "");
}

/**
 * Converts a Word file to HTML the editor understands. What the editor has
 * no equivalent for (styles, text boxes, tracked changes) is left out.
 */
export async function docxToHtml(
  path: string,
  storeImage: StoreImage,
): Promise<string> {
  const { value } = await mammoth.convertToHtml(
    { path },
    {
      // Mammoth leaves underline out unless asked.
      styleMap: ["u => u"],
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = Buffer.from(await image.readAsBuffer());
        const src = await storeImage(buffer, image.contentType);
        return { src: src ?? "" };
      }),
    },
  );
  return adaptWordHtml(value);
}
