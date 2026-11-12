import { describe, expect, it } from "vitest";
import {
  boundsOf,
  intersects,
  isOutside,
  keepInside,
  snapMove,
  type Frame,
} from "./labelGeometry";

const frame: Frame = { widthMm: 90, heightMm: 50, marginMm: 5 };

describe("snapping a moved box to guides", () => {
  it("snaps the left edge to the margin and shows that guide", () => {
    const result = snapMove(
      { x: 5.6, y: 15, width: 30, height: 4 },
      [],
      frame,
      1,
    );

    expect(result.dx).toBeCloseTo(-0.6);
    expect(result.dy).toBe(0);
    expect(result.guides).toContainEqual({ axis: "x", at: 5 });
  });

  it("snaps the centre to the label's centre", () => {
    const result = snapMove(
      { x: 29.5, y: 10, width: 30, height: 4 },
      [],
      frame,
      1,
    );

    expect(result.dx).toBeCloseTo(0.5);
    expect(result.guides).toContainEqual({ axis: "x", at: 45 });
  });

  it("aligns with the edges of other boxes", () => {
    const other = { x: 40, y: 12, width: 20, height: 5 };
    const result = snapMove(
      { x: 10, y: 12.4, width: 20, height: 5 },
      [other],
      frame,
      1,
    );

    expect(result.dy).toBeCloseTo(-0.4);
    expect(result.guides).toContainEqual({ axis: "y", at: 12 });
    expect(result.guides).toContainEqual({ axis: "y", at: 17 });
  });

  it("leaves the box alone when nothing is near", () => {
    expect(
      snapMove({ x: 13, y: 13, width: 7, height: 3 }, [], frame, 1),
    ).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  it("prefers the closest guide", () => {
    const result = snapMove(
      { x: 4.4, y: 20, width: 10, height: 4 },
      [{ x: 4.9, y: 0, width: 1, height: 1 }],
      frame,
      1,
    );

    expect(result.dx).toBeCloseTo(0.5);
  });
});

describe("rectangles", () => {
  it("bounds several boxes", () => {
    expect(
      boundsOf([
        { x: 5, y: 10, width: 10, height: 5 },
        { x: 20, y: 2, width: 5, height: 5 },
      ]),
    ).toEqual({ x: 5, y: 2, width: 20, height: 13 });
  });

  it("tells when a marquee touches a box", () => {
    const box = { x: 10, y: 10, width: 10, height: 5 };

    expect(intersects(box, { x: 18, y: 0, width: 5, height: 11 })).toBe(true);
    expect(intersects(box, { x: 21, y: 0, width: 5, height: 20 })).toBe(false);
  });

  it("tells when a box goes past the label's edge", () => {
    expect(isOutside({ x: 60, y: 10, width: 30, height: 5 }, frame)).toBe(
      false,
    );
    expect(isOutside({ x: 60, y: 46, width: 30, height: 5 }, frame)).toBe(true);
    expect(isOutside({ x: 61, y: 10, width: 30, height: 5 }, frame)).toBe(true);
  });
});

describe("keeping a box inside the label", () => {
  it("stops it at the edges", () => {
    expect(keepInside({ x: 70, y: -3, width: 30, height: 5 }, frame)).toEqual({
      x: 60,
      y: 0,
      width: 30,
      height: 5,
    });
    expect(keepInside({ x: 10, y: 10, width: 30, height: 5 }, frame)).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 5,
    });
  });
});
