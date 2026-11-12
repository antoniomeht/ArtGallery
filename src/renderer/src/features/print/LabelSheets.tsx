import type { CSSProperties } from "react";
import type { Artwork } from "../../../../shared/artwork";
import type { DimensionUnit } from "../../../../shared/dimensions";
import {
  labelLayout,
  paginate,
  SHEET,
  type LabelTemplate,
} from "../../../../shared/labels";
import { LabelCard } from "./LabelCard";

interface LabelSheetsProps {
  artworks: Artwork[];
  template: LabelTemplate;
  unit: DimensionUnit;
}

/** A4 sheets with labels in a grid and dashed lines to cut along. */
export function LabelSheets({ artworks, template, unit }: LabelSheetsProps) {
  const { columns, perSheet } = labelLayout(template);
  const style = {
    padding: `${SHEET.marginMm}mm`,
    gap: `${SHEET.gapMm}mm`,
    gridTemplateColumns: `repeat(${columns}, ${template.widthMm}mm)`,
    gridAutoRows: `${template.heightMm}mm`,
  } as CSSProperties;

  return (
    <div className="label-sheets">
      {paginate(artworks, perSheet).map((sheet, index) => (
        <section key={index} className="label-sheet" style={style}>
          {sheet.map((artwork) => (
            <LabelCard
              key={artwork.id}
              artwork={artwork}
              template={template}
              unit={unit}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
