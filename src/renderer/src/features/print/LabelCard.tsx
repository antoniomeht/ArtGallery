import type { CSSProperties } from "react";
import type { Artwork } from "../../../../shared/artwork";
import type { DimensionUnit } from "../../../../shared/dimensions";
import {
  labelLines,
  TEXT_SIZE_SCALE,
  type LabelField,
  type LabelOptions,
} from "../../../../shared/labels";
import { thumbnailUrl } from "../../../../shared/media";

interface LabelCardProps {
  artwork: Artwork;
  options: LabelOptions;
  unit: DimensionUnit;
}

/** Height of the small preset; text grows in proportion to the label. */
const REFERENCE_HEIGHT_MM = 50;

const LINE_CLASS: Record<LabelField, string> = {
  artist: "label-card__artist",
  title: "label-card__title",
  year: "label-card__detail",
  medium: "label-card__detail",
  dimensions: "label-card__detail",
  price: "label-card__detail",
};

/**
 * Wall label beside an artwork. Sized in millimetres so the preview and the
 * printed sheet are the same drawing.
 */
export function LabelCard({ artwork, options, unit }: LabelCardProps) {
  const lines = labelLines(artwork, options.fields, unit);
  const image = options.showImage ? artwork.images[0] : undefined;
  const style = {
    width: `${options.widthMm}mm`,
    height: `${options.heightMm}mm`,
    "--label-scale":
      Math.min(2, Math.max(0.8, options.heightMm / REFERENCE_HEIGHT_MM)) *
      TEXT_SIZE_SCALE[options.textSize],
  } as CSSProperties;

  return (
    <div
      className={`label-card label-card--${options.font}`}
      data-image={image ? "" : undefined}
      style={style}
    >
      {image && (
        <img
          className="label-card__image"
          src={thumbnailUrl(image.id)}
          alt=""
        />
      )}
      <div className="label-card__text">
        {lines.map(({ field, text, year }) => (
          <p key={field} className={LINE_CLASS[field]}>
            {field === "title" ? (
              <span className="artwork-title">{text}</span>
            ) : (
              text
            )}
            {year && `, ${year}`}
          </p>
        ))}
      </div>
    </div>
  );
}
