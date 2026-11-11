import { DOMParser } from "@xmldom/xmldom";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import type {
  SheetPreview,
  SpreadsheetPreview,
} from "../../shared/spreadsheet";

type XmlElement = Element;

/** Enough to recognise a sheet; more would make the preview slow. */
const DEFAULT_LIMITS = { maxRows: 1000, maxColumns: 100 };
/** No part of a real workbook comes near this; a zip bomb does. */
const MAX_PART_BYTES = 200 * 1024 * 1024;

/** Excel's built-in number formats that show a date or a time. */
const DATE_FORMAT_IDS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH_1900 = Date.UTC(1899, 11, 30);
const EPOCH_1904 = Date.UTC(1904, 0, 1);

/**
 * The cells of an .xlsx file as the text Excel would show, without formats.
 * Only values are read: formulas show their last result.
 */
export async function readXlsx(
  path: string,
  limits: { maxRows: number; maxColumns: number } = DEFAULT_LIMITS,
): Promise<SpreadsheetPreview> {
  const parts = await readParts(path);
  const xml = (name: string) => {
    const text = parts.get(name);
    return text === undefined ? null : parseXml(text);
  };

  const workbook = xml("xl/workbook.xml");
  if (!workbook) throw new Error("Not a spreadsheet");
  const date1904 = ["1", "true"].includes(
    childrenNamed(workbook, "workbookPr")[0]?.getAttribute("date1904") ?? "",
  );
  const targets = relationshipTargets(xml("xl/_rels/workbook.xml.rels"));
  const sharedStrings = readSharedStrings(xml("xl/sharedStrings.xml"));
  const dateStyles = readDateStyles(xml("xl/styles.xml"));

  const sheets: SheetPreview[] = [];
  for (const sheet of childrenNamed(workbook, "sheet")) {
    const target = targets.get(relationshipId(sheet));
    const data = target ? xml(target) : null;
    if (!data) continue;
    sheets.push({
      name: sheet.getAttribute("name") ?? "",
      ...readCells(data, limits, (cell) =>
        cellText(cell, sharedStrings, dateStyles, date1904),
      ),
    });
  }
  return { sheets };
}

function readCells(
  sheet: XmlElement,
  { maxRows, maxColumns }: { maxRows: number; maxColumns: number },
  textOf: (cell: XmlElement) => string,
): Pick<SheetPreview, "rows" | "truncated"> {
  const cells = new Map<number, Map<number, string>>();
  let truncated = false;
  let height = 0;
  let width = 0;
  let nextRow = 0;
  for (const row of childrenNamed(sheet, "row")) {
    const rowIndex = Number(row.getAttribute("r") ?? nextRow + 1) - 1;
    nextRow = rowIndex + 1;
    let nextColumn = 0;
    for (const cell of childrenNamed(row, "c")) {
      const column = columnIndex(cell.getAttribute("r")) ?? nextColumn;
      nextColumn = column + 1;
      const text = textOf(cell);
      if (!text) continue;
      if (rowIndex >= maxRows || column >= maxColumns) {
        truncated = true;
        continue;
      }
      if (!cells.has(rowIndex)) cells.set(rowIndex, new Map());
      cells.get(rowIndex)!.set(column, text);
      height = Math.max(height, rowIndex + 1);
      width = Math.max(width, column + 1);
    }
  }
  const rows = Array.from({ length: height }, (_row, r) =>
    Array.from({ length: width }, (_cell, c) => cells.get(r)?.get(c) ?? ""),
  );
  return { rows, truncated };
}

function cellText(
  cell: XmlElement,
  sharedStrings: readonly string[],
  dateStyles: ReadonlyMap<number, "date" | "datetime">,
  date1904: boolean,
): string {
  const type = cell.getAttribute("t");
  const value = childrenNamed(cell, "v")[0]?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "inlineStr") return textRuns(cell);
  if (type === "b") return value === "1" ? "VERDADERO" : "FALSO";
  if (type === "str" || type === "e" || !value) return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const dateStyle = dateStyles.get(Number(cell.getAttribute("s") ?? 0));
  if (dateStyle) return formatDate(number, dateStyle, date1904);
  return String(Number(number.toPrecision(15))).replace(".", ",");
}

function formatDate(
  serial: number,
  style: "date" | "datetime",
  date1904: boolean,
): string {
  const date = new Date(
    (date1904 ? EPOCH_1904 : EPOCH_1900) + Math.round(serial * DAY_MS),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
  return style === "datetime"
    ? `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
    : day;
}

/** For each cell style, whether its number format shows a date (and time). */
function readDateStyles(
  styles: XmlElement | null,
): Map<number, "date" | "datetime"> {
  const result = new Map<number, "date" | "datetime">();
  if (!styles) return result;
  const customFormats = new Map(
    childrenNamed(styles, "numFmt").map((format) => [
      Number(format.getAttribute("numFmtId")),
      format.getAttribute("formatCode") ?? "",
    ]),
  );
  const cellXfs = childrenNamed(styles, "cellXfs")[0];
  if (!cellXfs) return result;
  childrenNamed(cellXfs, "xf").forEach((xf, index) => {
    const id = Number(xf.getAttribute("numFmtId") ?? 0);
    const code = customFormats.get(id);
    const kind =
      code !== undefined
        ? dateKind(code)
        : DATE_FORMAT_IDS.has(id)
          ? id >= 18 && id <= 22
            ? "datetime"
            : "date"
          : null;
    if (kind) result.set(index, kind);
  });
  return result;
}

function dateKind(formatCode: string): "date" | "datetime" | null {
  // Quoted text, escaped characters and [colours] say nothing about dates.
  const code = formatCode
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/\[[^\]]*\]/g, "");
  if (!/[dy]/i.test(code)) return null;
  return /h/i.test(code) ? "datetime" : "date";
}

function readSharedStrings(table: XmlElement | null): string[] {
  return table ? childrenNamed(table, "si").map(textRuns) : [];
}

/** The text of a rich-text item; phonetic hints are left out. */
function textRuns(element: XmlElement): string {
  return childrenNamed(element, "t")
    .filter((t) => (t.parentNode as XmlElement | null)?.localName !== "rPh")
    .map((t) => t.textContent ?? "")
    .join("");
}

function relationshipTargets(rels: XmlElement | null): Map<string, string> {
  const targets = new Map<string, string>();
  for (const rel of rels ? childrenNamed(rels, "Relationship") : []) {
    const target = rel.getAttribute("Target") ?? "";
    targets.set(
      rel.getAttribute("Id") ?? "",
      target.startsWith("/") ? target.slice(1) : `xl/${target}`,
    );
  }
  return targets;
}

function relationshipId(sheet: XmlElement): string {
  for (const attribute of Array.from(sheet.attributes)) {
    if (attribute.localName === "id") return attribute.value;
  }
  return "";
}

/** "AB12" → 27; null without a reference. */
function columnIndex(reference: string | null): number | null {
  const letters = /^[A-Z]+/i.exec(reference ?? "")?.[0];
  if (!letters) return null;
  return (
    [...letters.toUpperCase()].reduce(
      (index, letter) => index * 26 + letter.charCodeAt(0) - 64,
      0,
    ) - 1
  );
}

/** Every descendant with this local name, whatever its namespace prefix. */
function childrenNamed(element: XmlElement, name: string): XmlElement[] {
  return Array.from(element.getElementsByTagNameNS("*", name));
}

function parseXml(text: string): XmlElement {
  const document = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: (message: string) => {
        throw new Error(message);
      },
    },
  }).parseFromString(text, "application/xml");
  return document.documentElement;
}

/** The XML parts under xl/, as text. */
async function readParts(path: string): Promise<Map<string, string>> {
  const zip: ZipFile = await yauzl.openPromise(path, {
    lazyEntries: true,
    validateEntrySizes: true,
  });
  const parts = new Map<string, string>();
  try {
    for await (const entry of (
      zip as ZipFile & { eachEntry(): AsyncIterable<Entry> }
    ).eachEntry()) {
      if (!/^xl\/.*\.(xml|rels)$/.test(entry.fileName)) continue;
      if (entry.uncompressedSize > MAX_PART_BYTES) {
        throw new Error(`${entry.fileName} is too large`);
      }
      const chunks: Buffer[] = [];
      for await (const chunk of await zip.openReadStreamPromise(entry)) {
        chunks.push(chunk as Buffer);
      }
      parts.set(entry.fileName, Buffer.concat(chunks).toString("utf8"));
    }
  } finally {
    zip.close();
  }
  return parts;
}
