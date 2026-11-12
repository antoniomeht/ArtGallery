/** Rectangles and guides on a label, all in millimetres. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Frame {
  widthMm: number;
  heightMm: number;
  marginMm: number;
}

/** A line across the label that a moved box lines up with. */
export interface Guide {
  axis: "x" | "y";
  at: number;
}

const EPSILON = 0.01;

/** Start, centre and end of a rectangle along one axis. */
function stops(rect: Rect, axis: Guide["axis"]): number[] {
  const start = axis === "x" ? rect.x : rect.y;
  const size = axis === "x" ? rect.width : rect.height;
  return [start, start + size / 2, start + size];
}

function lines(others: readonly Rect[], frame: Frame, axis: Guide["axis"]) {
  const size = axis === "x" ? frame.widthMm : frame.heightMm;
  return [
    0,
    frame.marginMm,
    size / 2,
    size - frame.marginMm,
    size,
    ...others.flatMap((rect) => stops(rect, axis)),
  ];
}

function snapAxis(
  moving: Rect,
  others: readonly Rect[],
  frame: Frame,
  threshold: number,
  axis: Guide["axis"],
): { offset: number; guides: Guide[] } {
  const candidates = lines(others, frame, axis);
  let offset = 0;
  let best = threshold + EPSILON;
  for (const stop of stops(moving, axis)) {
    for (const line of candidates) {
      const distance = Math.abs(line - stop);
      if (distance < best) {
        best = distance;
        offset = line - stop;
      }
    }
  }
  if (best > threshold) return { offset: 0, guides: [] };
  const snapped = stops(moving, axis).map((stop) => stop + offset);
  const guides = [...new Set(candidates)]
    .filter((line) => snapped.some((stop) => Math.abs(stop - line) < EPSILON))
    .map((at) => ({ axis, at }));
  return { offset, guides };
}

/**
 * How far to shift a moved box so its edges or centre line up with the
 * label's edges, centre and margins or with other boxes, when one is within
 * `threshold`; and the guides it then lines up with.
 */
export function snapMove(
  moving: Rect,
  others: readonly Rect[],
  frame: Frame,
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const x = snapAxis(moving, others, frame, threshold, "x");
  const y = snapAxis(moving, others, frame, threshold, "y");
  return { dx: x.offset, dy: y.offset, guides: [...x.guides, ...y.guides] };
}

/** The smallest rectangle holding all of `rects`. */
export function boundsOf(rects: readonly Rect[]): Rect {
  const left = Math.min(...rects.map(({ x }) => x));
  const top = Math.min(...rects.map(({ y }) => y));
  const right = Math.max(...rects.map(({ x, width }) => x + width));
  const bottom = Math.max(...rects.map(({ y, height }) => y + height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    b.x <= a.x + a.width &&
    a.y <= b.y + b.height &&
    b.y <= a.y + a.height
  );
}

/** True when part of `rect` falls past the label's edge. */
export function isOutside(rect: Rect, frame: Frame): boolean {
  return (
    rect.x < -EPSILON ||
    rect.y < -EPSILON ||
    rect.x + rect.width > frame.widthMm + EPSILON ||
    rect.y + rect.height > frame.heightMm + EPSILON
  );
}

/** `rect` moved the least needed to lie inside the label, size unchanged. */
export function keepInside(rect: Rect, frame: Frame): Rect {
  const fit = (start: number, size: number, room: number) =>
    Math.min(Math.max(start, 0), Math.max(0, room - size));
  return {
    ...rect,
    x: fit(rect.x, rect.width, frame.widthMm),
    y: fit(rect.y, rect.height, frame.heightMm),
  };
}
