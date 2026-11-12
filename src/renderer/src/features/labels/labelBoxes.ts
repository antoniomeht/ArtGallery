import {
  elementHeightMm,
  type LabelElementKind,
  type LabelTemplate,
} from "../../../../shared/labels";
import type { Rect } from "../../../../shared/labelGeometry";

export const KIND_LABELS: Record<LabelElementKind, string> = {
  image: "Imagen de la obra",
  artist: "Artista",
  title: "Título",
  year: "Año",
  medium: "Técnica y soporte",
  dimensions: "Dimensiones",
  price: "Precio",
};

/** CSS pixels are 1/96 inch. */
export const MM_PER_PX = 25.4 / 96;

/**
 * Where each box of a drawn label really is, in millimetres. Boxes the
 * artwork has no data for are not drawn and take their template place,
 * one line high.
 */
export function measureBoxes(
  card: HTMLElement,
  template: LabelTemplate,
): Map<LabelElementKind, Rect> {
  const rects = new Map<LabelElementKind, Rect>();
  for (const element of template.elements) {
    rects.set(element.kind, {
      x: element.xMm,
      y: element.yMm,
      width: element.widthMm,
      height: elementHeightMm(element),
    });
  }
  for (const node of card.querySelectorAll<HTMLElement>("[data-kind]")) {
    const kind = node.dataset.kind as LabelElementKind;
    if (!rects.has(kind)) continue;
    rects.set(kind, {
      x: node.offsetLeft * MM_PER_PX,
      y: node.offsetTop * MM_PER_PX,
      width: node.offsetWidth * MM_PER_PX,
      height: node.offsetHeight * MM_PER_PX,
    });
  }
  return rects;
}

/** Kinds drawn on the card, as opposed to boxes the artwork has no data for. */
export function drawnKinds(card: HTMLElement): Set<LabelElementKind> {
  return new Set(
    [...card.querySelectorAll<HTMLElement>("[data-kind]")].map(
      (node) => node.dataset.kind as LabelElementKind,
    ),
  );
}
