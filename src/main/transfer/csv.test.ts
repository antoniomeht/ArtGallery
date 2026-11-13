import { describe, expect, it } from "vitest";
import { artworkFieldsSchema, type Artwork } from "../../shared/artwork";
import { toCsv } from "./csv";

function artwork(fields: Parameters<typeof artworkFieldsSchema.parse>[0]) {
  return {
    ...artworkFieldsSchema.parse(fields),
    id: "a1",
    images: [],
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z",
    deletedAt: null,
    needsReview: false,
    favorite: false,
  } satisfies Artwork;
}

const rowsOf = (csv: string) => csv.split("\r\n").filter(Boolean);

describe("CSV export", () => {
  it("starts with a BOM and a header row in Spanish", () => {
    const csv = toCsv([]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rowsOf(csv.slice(1))[0]).toMatch(
      /^Id;Título;Nº de inventario;Artista;/,
    );
  });

  it("writes readable values with decimal commas", () => {
    const [, row] = rowsOf(
      toCsv([
        artwork({
          title: "Marina",
          dimensions: { cm: { height: 65.5 }, in: { height: 25.787 } },
          status: "loaned",
          tags: ["mar", "puerto"],
          yearApproximate: true,
        }),
      ]),
    );

    expect(row).toContain(";Marina;");
    // Ancho and Alto (cm), then in the inch columns 25.787 shown with one decimal.
    expect(row).toContain(";65,5;");
    expect(row).toContain(";25,8;");
    expect(row).toContain(";Prestada;");
    expect(row).toContain(";mar, puerto;");
    expect(row).toContain(";Sí;");
  });

  it("quotes separators, quotes and line breaks", () => {
    const [, row] = rowsOf(
      toCsv([artwork({ title: 'Bodegón; "azul"', notes: "línea 1" })]),
    );

    expect(row).toContain(';"Bodegón; ""azul""";');
  });

  it("neutralises text that a spreadsheet would run as a formula", () => {
    const [, row] = rowsOf(
      toCsv([artwork({ title: '=HYPERLINK("http://x")', artist: "@user" })]),
    );

    expect(row).toContain(`;"'=HYPERLINK(""http://x"")";`);
    expect(row).toContain(";'@user;");
  });

  it("keeps negative numbers as numbers", () => {
    const [, row] = rowsOf(toCsv([artwork({ title: "Ánfora", year: -500 })]));

    expect(row).toContain(";-500;");
  });

  it("lists the collections of each artwork", () => {
    const csv = toCsv([artwork({ title: "Marina" })], () => [
      "Obra en papel",
      "Serie del puerto",
    ]);
    const [header, row] = rowsOf(csv.slice(1));

    expect(header).toContain(";Colecciones;");
    expect(row).toContain(";Obra en papel, Serie del puerto;");
  });
});
