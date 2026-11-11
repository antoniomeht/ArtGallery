import { useEffect, useState } from "react";
import type { SpreadsheetPreview as Workbook } from "../../../../shared/spreadsheet";

type WorkbookState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; workbook: Workbook };

/** "A", "B"… "Z", "AA"… as Excel names its columns. */
function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

/**
 * The cells of an uploaded Excel file, sheet by sheet, as text. Formats,
 * charts and pictures are left out; the original file is untouched. Mount
 * it again (key) for another document.
 */
export function SpreadsheetPreview({ documentId }: { documentId: string }) {
  const [state, setState] = useState<WorkbookState>({ status: "loading" });
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.previewXlsx(documentId).then(
      (workbook) => isCurrent && setState({ status: "ready", workbook }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [documentId]);

  if (state.status === "loading") {
    return (
      <p className="documents__status" role="status">
        Preparando la vista…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="documents__status" role="alert">
        No se pudo leer este libro de Excel.
      </p>
    );
  }

  const { sheets } = state.workbook;
  const sheet = sheets[sheetIndex] ?? sheets[0];
  if (!sheet) {
    return <p className="documents__status">Este libro no tiene hojas.</p>;
  }
  const width = sheet.rows[0]?.length ?? 0;

  return (
    <div className="sheet-preview">
      {sheets.length > 1 && (
        <div className="sheet-preview__tabs" role="group" aria-label="Hojas">
          {sheets.map(({ name }, index) => (
            <button
              key={index}
              type="button"
              className="sheet-preview__tab"
              aria-pressed={sheet === sheets[index]}
              onClick={() => setSheetIndex(index)}
            >
              {name || `Hoja ${index + 1}`}
            </button>
          ))}
        </div>
      )}
      {sheet.rows.length === 0 ? (
        <p className="documents__status">Esta hoja está vacía.</p>
      ) : (
        <div className="sheet-preview__scroll">
          <table className="sheet-preview__table" aria-label={sheet.name}>
            <thead>
              <tr>
                <td className="sheet-preview__corner" />
                {Array.from({ length: width }, (_cell, column) => (
                  <th key={column} scope="col">
                    {columnName(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th scope="row">{rowIndex + 1}</th>
                  {row.map((text, column) => (
                    <td
                      key={column}
                      title={text.length > 40 ? text : undefined}
                    >
                      {text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sheet.truncated && (
        <p className="sheet-preview__note">
          Solo se muestran las primeras filas y columnas. Abre el archivo para
          verlo entero.
        </p>
      )}
    </div>
  );
}
