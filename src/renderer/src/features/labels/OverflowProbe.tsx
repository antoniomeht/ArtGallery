import { useDeferredValue, useLayoutEffect, useRef } from "react";
import type { Artwork } from "../../../../shared/artwork";
import type { DimensionUnit } from "../../../../shared/dimensions";
import { isOutside } from "../../../../shared/labelGeometry";
import type { LabelTemplate } from "../../../../shared/labels";
import { LabelCard } from "../print/LabelCard";
import { drawnKinds, measureBoxes } from "./labelBoxes";

interface OverflowProbeProps {
  artworks: readonly Artwork[];
  template: LabelTemplate;
  unit: DimensionUnit;
  /** Indexes of the artworks whose label has a text past its edge. */
  onResult: (indexes: number[]) => void;
}

/**
 * Draws every label out of sight to find texts that do not fit, such as a
 * long title that runs past the bottom edge. Images keep their box and never
 * overflow, so they are left out.
 */
export function OverflowProbe({
  artworks,
  template,
  unit,
  onResult,
}: OverflowProbeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(template);
  const texts = {
    ...deferred,
    elements: deferred.elements.filter(({ kind }) => kind !== "image"),
  };
  const last = useRef("");

  useLayoutEffect(() => {
    const cards = ref.current?.querySelectorAll<HTMLElement>(".label-card");
    if (!cards) return;
    const found: number[] = [];
    cards.forEach((card, index) => {
      const rects = measureBoxes(card, texts);
      const outside = [...drawnKinds(card)].some((kind) => {
        const rect = rects.get(kind);
        return rect && isOutside(rect, deferred);
      });
      if (outside) found.push(index);
    });
    const key = found.join(",");
    if (key !== last.current) {
      last.current = key;
      onResult(found);
    }
  });

  if (texts.elements.length === 0) return null;
  return (
    <div ref={ref} className="labels-dialog__probe" aria-hidden>
      {artworks.map((artwork) => (
        <LabelCard
          key={artwork.id}
          artwork={artwork}
          template={texts}
          unit={unit}
        />
      ))}
    </div>
  );
}
