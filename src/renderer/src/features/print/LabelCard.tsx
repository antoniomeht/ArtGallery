import type { CSSProperties } from "react";
import type { Artwork } from "../../../../shared/artwork";
import {
  formatDimensions,
  formatMedium,
  formatPrice,
  formatYear,
} from "../../../../shared/artworkFormat";
import type { LabelOptions } from "../../../../shared/labels";

interface LabelCardProps {
  artwork: Artwork;
  options: LabelOptions;
}

/** Height of the small preset; text grows in proportion to the label. */
const REFERENCE_HEIGHT_MM = 50;

/**
 * Wall label beside an artwork. Sized in millimetres so the preview and the
 * printed sheet are the same drawing.
 */
export function LabelCard({ artwork, options }: LabelCardProps) {
  const show = new Set(options.fields);
  const year = show.has("year") ? formatYear(artwork) : null;
  const details = [
    show.has("medium") && formatMedium(artwork),
    show.has("dimensions") && formatDimensions(artwork),
    show.has("price") && formatPrice(artwork),
  ].filter((line): line is string => Boolean(line));
  const style = {
    width: `${options.widthMm}mm`,
    height: `${options.heightMm}mm`,
    "--label-scale": Math.min(
      2,
      Math.max(0.8, options.heightMm / REFERENCE_HEIGHT_MM),
    ),
  } as CSSProperties;

  return (
    <div className="label-card" style={style}>
      {show.has("artist") && artwork.artist && (
        <p className="label-card__artist">{artwork.artist}</p>
      )}
      {(show.has("title") || year) && (
        <p className="label-card__title">
          {show.has("title") && (
            <span className="artwork-title">{artwork.title}</span>
          )}
          {show.has("title") && year && ", "}
          {year}
        </p>
      )}
      {details.map((line) => (
        <p key={line} className="label-card__detail">
          {line}
        </p>
      ))}
    </div>
  );
}
