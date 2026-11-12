import type { CSSProperties, ReactNode } from "react";
import type { Artwork } from "../../../../shared/artwork";
import type { DimensionUnit } from "../../../../shared/dimensions";
import {
  labelTexts,
  LINE_HEIGHT,
  type LabelElement,
  type LabelTemplate,
} from "../../../../shared/labels";
import { thumbnailUrl } from "../../../../shared/media";

interface LabelCardProps {
  artwork: Artwork;
  template: LabelTemplate;
  unit: DimensionUnit;
  /** Drawn over the label, in the same millimetre space; used by the editor. */
  children?: ReactNode;
}

const boxStyle = (element: LabelElement): CSSProperties => ({
  left: `${element.xMm}mm`,
  top: `${element.yMm}mm`,
  width: `${element.widthMm}mm`,
  height: element.heightMm === null ? undefined : `${element.heightMm}mm`,
  fontSize: `${element.fontSizePt}pt`,
  lineHeight: LINE_HEIGHT,
  fontWeight: element.bold ? 700 : 400,
  fontStyle: element.italic ? "italic" : "normal",
});

/**
 * Wall label beside an artwork, with each box where the template puts it.
 * Sized in millimetres so the preview and the printed sheet are the same
 * drawing.
 */
export function LabelCard({
  artwork,
  template,
  unit,
  children,
}: LabelCardProps) {
  const texts = labelTexts(artwork, unit);
  const image = artwork.images[0];

  return (
    <div
      className={`label-card label-card--${template.font}`}
      style={{
        width: `${template.widthMm}mm`,
        height: `${template.heightMm}mm`,
      }}
    >
      {template.elements.map((element) => {
        if (element.kind === "image") {
          return (
            image && (
              <img
                key="image"
                className="label-card__box label-card__image"
                data-kind="image"
                src={thumbnailUrl(image.id)}
                alt=""
                style={boxStyle(element)}
              />
            )
          );
        }
        const text = texts[element.kind];
        return (
          text && (
            <p
              key={element.kind}
              className="label-card__box"
              data-kind={element.kind}
              style={boxStyle(element)}
            >
              {text}
            </p>
          )
        );
      })}
      {children}
    </div>
  );
}
