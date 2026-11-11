/** One sheet as text, cell by cell, the first rows and columns only. */
export interface SheetPreview {
  name: string;
  rows: string[][];
  /** True when rows or columns beyond the limits were left out. */
  truncated: boolean;
}

export interface SpreadsheetPreview {
  sheets: SheetPreview[];
}
