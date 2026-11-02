import type { CSSProperties } from "react";
import type { Artwork } from "../../../../shared/artwork";
import {
  labelLayout,
  paginate,
  SHEET,
  type LabelOptions,
} from "../../../../shared/labels";
import { LabelCard } from "./LabelCard";

interface LabelSheetsProps {
  artworks: Artwork[];
  options: LabelOptions;
}

/** A4 sheets with labels in a grid and dashed lines to cut along. */
export function LabelSheets({ artworks, options }: LabelSheetsProps) {
  const { columns, perSheet } = labelLayout(options);
  const style = {
    padding: `${SHEET.marginMm}mm`,
    gap: `${SHEET.gapMm}mm`,
    gridTemplateColumns: `repeat(${columns}, ${options.widthMm}mm)`,
    gridAutoRows: `${options.heightMm}mm`,
  } as CSSProperties;

  return (
    <div className="label-sheets">
      {paginate(artworks, perSheet).map((sheet, index) => (
        <section key={index} className="label-sheet" style={style}>
          {sheet.map((artwork) => (
            <LabelCard key={artwork.id} artwork={artwork} options={options} />
          ))}
        </section>
      ))}
    </div>
  );
}
