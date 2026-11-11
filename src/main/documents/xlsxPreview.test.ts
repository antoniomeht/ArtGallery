import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { describe, expect, it } from "vitest";
import yazl from "yazl";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { readXlsx } from "./xlsxPreview";

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

interface SheetSpec {
  name: string;
  cells: string;
}

/** A minimal workbook, written the way Excel lays out its parts. */
async function writeXlsx(
  path: string,
  sheets: SheetSpec[],
  {
    sharedStrings = [] as string[],
    styles = `<styleSheet xmlns="${MAIN}"><cellXfs count="1"><xf numFmtId="0"/></cellXfs></styleSheet>`,
    date1904 = false,
  } = {},
): Promise<void> {
  const zip = new yazl.ZipFile();
  const add = (name: string, xml: string) =>
    zip.addBuffer(Buffer.from(xml, "utf8"), name);
  add(
    "xl/workbook.xml",
    `<workbook xmlns="${MAIN}" xmlns:r="${REL}">${
      date1904 ? '<workbookPr date1904="1"/>' : ""
    }<sheets>${sheets
      .map(
        ({ name }, index) =>
          `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join("")}</sheets></workbook>`,
  );
  add(
    "xl/_rels/workbook.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map(
        (_sheet, index) =>
          `<Relationship Id="rId${index + 1}" Target="worksheets/sheet${index + 1}.xml"/>`,
      )
      .join("")}</Relationships>`,
  );
  add(
    "xl/sharedStrings.xml",
    `<sst xmlns="${MAIN}">${sharedStrings
      .map((text) => `<si>${text}</si>`)
      .join("")}</sst>`,
  );
  add("xl/styles.xml", styles);
  sheets.forEach(({ cells }, index) =>
    add(
      `xl/worksheets/sheet${index + 1}.xml`,
      `<worksheet xmlns="${MAIN}"><sheetData>${cells}</sheetData></worksheet>`,
    ),
  );
  zip.end();
  await pipeline(zip.outputStream, createWriteStream(path));
}

describe("reading a spreadsheet to look at", () => {
  it("reads each sheet's cells in place, with shared and inline text", async () => {
    const file = join(await useTempDir(), "precios.xlsx");
    await writeXlsx(
      file,
      [
        {
          name: "Obras",
          cells:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
            '<row r="3"><c r="A3" t="inlineStr"><is><t>Paisaje</t></is></c><c r="B3"><v>1250.5</v></c><c r="C3" t="b"><v>1</v></c></row>',
        },
        {
          name: "Notas",
          cells: '<row r="1"><c r="B1" t="str"><v>hola</v></c></row>',
        },
      ],
      {
        sharedStrings: ["<t>Título</t>", "<r><t>Ven</t></r><r><t>dida</t></r>"],
      },
    );

    const { sheets } = await readXlsx(file);

    expect(sheets).toEqual([
      {
        name: "Obras",
        rows: [
          ["Título", "", "Vendida"],
          ["", "", ""],
          ["Paisaje", "1250,5", "VERDADERO"],
        ],
        truncated: false,
      },
      { name: "Notas", rows: [["", "hola"]], truncated: false },
    ]);
  });

  it("shows dates as dates", async () => {
    const file = join(await useTempDir(), "fechas.xlsx");
    await writeXlsx(
      file,
      [
        {
          name: "Hoja1",
          cells:
            '<row r="1"><c r="A1" s="1"><v>45366</v></c><c r="B1" s="2"><v>45366.5</v></c><c r="C1"><v>45366</v></c></row>',
        },
      ],
      {
        styles: `<styleSheet xmlns="${MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>`,
      },
    );

    const { sheets } = await readXlsx(file);

    expect(sheets[0]!.rows).toEqual([
      ["15/03/2024", "15/03/2024 12:00", "45366"],
    ]);
  });

  it("stops at the row and column limits and says so", async () => {
    const file = join(await useTempDir(), "grande.xlsx");
    const rows = Array.from(
      { length: 5 },
      (_row, r) =>
        `<row r="${r + 1}">${["A", "B", "C", "D"]
          .map((col) => `<c r="${col}${r + 1}"><v>${r}</v></c>`)
          .join("")}</row>`,
    ).join("");
    await writeXlsx(file, [{ name: "Datos", cells: rows }]);

    const { sheets } = await readXlsx(file, { maxRows: 3, maxColumns: 2 });

    expect(sheets[0]).toEqual({
      name: "Datos",
      rows: [
        ["0", "0"],
        ["1", "1"],
        ["2", "2"],
      ],
      truncated: true,
    });
  });

  it("rejects a file that is not a spreadsheet", async () => {
    const dir = await useTempDir();
    const file = join(dir, "falso.xlsx");
    await pipeline(
      (async function* () {
        yield Buffer.from("no soy un zip");
      })(),
      createWriteStream(file),
    );

    await expect(readXlsx(file)).rejects.toThrow();
  });

  it("is offered for uploaded Excel files only", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const sheet = join(dataDir, "Precios.xlsx");
    await writeXlsx(sheet, [
      { name: "Hoja1", cells: '<row r="1"><c r="A1"><v>7</v></c></row>' },
    ]);
    const note = join(dataDir, "nota.txt");
    await writeFile(note, "hola");
    const {
      added: [uploadedSheet, uploadedNote],
    } = await documents.uploadFiles([sheet, note]);

    expect(await documents.previewXlsx(uploadedSheet!.id)).toEqual({
      sheets: [{ name: "Hoja1", rows: [["7"]], truncated: false }],
    });
    await expect(documents.previewXlsx(uploadedNote!.id)).rejects.toThrow(
      "not an Excel workbook",
    );
    db.close();
  });
});
