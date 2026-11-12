import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { Artwork } from "../../../../shared/artwork";
import type { DimensionUnit } from "../../../../shared/dimensions";
import {
  boundsOf,
  intersects,
  keepInside,
  snapMove,
  type Guide,
  type Rect,
} from "../../../../shared/labelGeometry";
import {
  moveElements,
  resizeElement,
  type LabelElementKind,
  type LabelTemplate,
} from "../../../../shared/labels";
import { LabelCard } from "../print/LabelCard";
import { drawnKinds, KIND_LABELS, measureBoxes, MM_PER_PX } from "./labelBoxes";
import "./LabelEditor.css";

interface LabelEditorProps {
  artwork: Artwork;
  template: LabelTemplate;
  unit: DimensionUnit;
  selected: readonly LabelElementKind[];
  onSelect: (kinds: LabelElementKind[]) => void;
  onChange: (template: LabelTemplate) => void;
  /** Supr on the selection. */
  onRemove: (kinds: readonly LabelElementKind[]) => void;
}

interface Point {
  x: number;
  y: number;
}

type Drag =
  | {
      mode: "move";
      start: Point;
      origin: LabelTemplate;
      kinds: LabelElementKind[];
      bounds: Rect;
      moved: boolean;
    }
  | {
      mode: "resize";
      start: Point;
      origin: LabelTemplate;
      kind: LabelElementKind;
      rect: Rect;
    }
  | { mode: "marquee"; start: Point; base: LabelElementKind[] };

/** Arrow keys move this far, or ten times as far with Shift. */
const NUDGE_MM = 0.5;
/** Guides catch a box within this many screen pixels. */
const SNAP_PX = 6;
/** Largest enlargement, so small labels stay comfortable to edit. */
const MAX_ZOOM = 6;

const rectStyle = ({ x, y, width, height }: Rect): CSSProperties => ({
  left: `${x}mm`,
  top: `${y}mm`,
  width: `${width}mm`,
  height: `${height}mm`,
});

const marqueeRect = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

/**
 * The label enlarged on a canvas: boxes are selected with a click, Shift+click
 * or a marquee, dragged with guides, resized from the corner handle and moved
 * with the arrow keys.
 */
export function LabelEditor({
  artwork,
  template,
  unit,
  selected,
  onSelect,
  onChange,
  onRemove,
}: LabelEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rects, setRects] = useState<Map<LabelElementKind, Rect>>(new Map());
  const [drawn, setDrawn] = useState<Set<LabelElementKind>>(new Set());
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Rect | null>(null);

  // The label grows to fill the canvas.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const width = template.widthMm / MM_PER_PX;
      const height = template.heightMm / MM_PER_PX;
      setZoom(
        Math.min(
          MAX_ZOOM,
          (frame.clientWidth - 48) / width,
          (frame.clientHeight - 48) / height,
        ),
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [template.widthMm, template.heightMm]);

  // Texts take the height of their lines, known only once drawn.
  useLayoutEffect(() => {
    const card = stageRef.current?.querySelector<HTMLElement>(".label-card");
    if (!card) return;
    setRects(measureBoxes(card, template));
    setDrawn(drawnKinds(card));
  }, [template, artwork, unit, zoom]);

  const frameOf = () => ({
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    marginMm: template.marginMm,
  });

  const pointAt = (event: PointerEvent): Point => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - box.left) / zoom) * MM_PER_PX,
      y: ((event.clientY - box.top) / zoom) * MM_PER_PX,
    };
  };

  const kindAt = (point: Point): LabelElementKind | null => {
    const hit = { ...point, width: 0, height: 0 };
    // The last box drawn is on top.
    for (const element of [...template.elements].reverse()) {
      const rect = rects.get(element.kind);
      if (rect && intersects(rect, hit)) return element.kind;
    }
    return null;
  };

  const otherRects = (kinds: readonly LabelElementKind[]) =>
    template.elements
      .filter(({ kind }) => !kinds.includes(kind))
      .flatMap(({ kind }) => rects.get(kind) ?? []);

  const snapThreshold = (SNAP_PX / zoom) * MM_PER_PX;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    stageRef.current?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = pointAt(event);
    const handle = (event.target as HTMLElement).dataset.handle as
      LabelElementKind | undefined;
    const handleRect = handle && rects.get(handle);
    if (handle && handleRect) {
      dragRef.current = {
        mode: "resize",
        start,
        origin: template,
        kind: handle,
        rect: handleRect,
      };
      return;
    }
    const kind = kindAt(start);
    if (!kind) {
      const base = event.shiftKey ? [...selected] : [];
      dragRef.current = { mode: "marquee", start, base };
      onSelect(base);
      return;
    }
    let kinds = [...selected];
    if (event.shiftKey && selected.includes(kind)) {
      onSelect(selected.filter((item) => item !== kind));
      return;
    }
    if (event.shiftKey) kinds = [...selected, kind];
    else if (!selected.includes(kind)) kinds = [kind];
    onSelect(kinds);
    dragRef.current = {
      mode: "move",
      start,
      origin: template,
      kinds,
      bounds: boundsOf(kinds.flatMap((item) => rects.get(item) ?? [])),
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointAt(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;

    if (drag.mode === "marquee") {
      const area = marqueeRect(drag.start, point);
      setMarquee(area);
      const touched = template.elements
        .map(({ kind }) => kind)
        .filter((kind) => {
          const rect = rects.get(kind);
          return rect && intersects(rect, area) && !drag.base.includes(kind);
        });
      onSelect([...drag.base, ...touched]);
      return;
    }

    if (drag.mode === "resize") {
      const corner = {
        x: drag.rect.x + drag.rect.width + dx,
        y: drag.rect.y + drag.rect.height + dy,
        width: 0,
        height: 0,
      };
      const snap = snapMove(
        corner,
        otherRects([drag.kind]),
        frameOf(),
        snapThreshold,
      );
      setGuides(snap.guides);
      onChange(
        resizeElement(
          drag.origin,
          drag.kind,
          drag.rect.width + dx + snap.dx,
          drag.rect.height + dy + snap.dy,
        ),
      );
      return;
    }

    // A click without moving only selects.
    if (!drag.moved && Math.hypot(dx, dy) < snapThreshold / 3) return;
    drag.moved = true;
    const { bounds, kinds } = drag;
    // Snapped where the boxes can really go, so guides match what is drawn.
    const placed = keepInside(
      { ...bounds, x: bounds.x + dx, y: bounds.y + dy },
      frameOf(),
    );
    const snap = snapMove(placed, otherRects(kinds), frameOf(), snapThreshold);
    setGuides(snap.guides);
    onChange(
      moveElements(
        drag.origin,
        kinds,
        placed.x - bounds.x + snap.dx,
        placed.y - bounds.y + snap.dy,
      ),
    );
  }

  function handlePointerUp() {
    dragRef.current = null;
    setGuides([]);
    setMarquee(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (selected.length === 0) return;
    const step = event.shiftKey ? NUDGE_MM * 10 : NUDGE_MM;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const offset = arrows[event.key];
    if (offset) {
      event.preventDefault();
      onChange(moveElements(template, selected, ...offset));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove(selected);
    } else if (event.key === "Escape") {
      // Clears the selection instead of closing the dialog.
      event.preventDefault();
      event.stopPropagation();
      onSelect([]);
    }
  }

  const single = selected.length === 1 ? selected[0] : undefined;
  const singleRect = single && rects.get(single);

  return (
    <div ref={frameRef} className="label-editor">
      <div
        className="label-editor__scaler"
        style={{
          width: (template.widthMm / MM_PER_PX) * zoom,
          height: (template.heightMm / MM_PER_PX) * zoom,
        }}
      >
        <div
          ref={stageRef}
          className="label-editor__stage"
          style={
            {
              transform: `scale(${zoom})`,
              "--zoom": zoom,
            } as CSSProperties
          }
          tabIndex={0}
          role="application"
          aria-label="Cartela. Arrastra los datos para moverlos; Supr los quita y las flechas los desplazan."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <LabelCard artwork={artwork} template={template} unit={unit}>
            <div className="label-editor__overlay">
              <div
                className="label-editor__margin"
                style={{ inset: `${template.marginMm}mm` }}
              />
              {template.elements
                .filter(({ kind }) => !drawn.has(kind))
                .map(({ kind }) => {
                  const rect = rects.get(kind);
                  return (
                    rect && (
                      <div
                        key={kind}
                        className="label-editor__placeholder"
                        style={rectStyle(rect)}
                      >
                        {KIND_LABELS[kind]}
                      </div>
                    )
                  );
                })}
              {selected.map((kind) => {
                const rect = rects.get(kind);
                return (
                  rect && (
                    <div
                      key={kind}
                      className="label-editor__selection"
                      style={rectStyle(rect)}
                    />
                  )
                );
              })}
              {single && singleRect && (
                <div
                  className="label-editor__handle"
                  data-handle={single}
                  title="Arrastra para cambiar el tamaño"
                  style={{
                    left: `${singleRect.x + singleRect.width}mm`,
                    top: `${singleRect.y + singleRect.height}mm`,
                  }}
                />
              )}
              {guides.map(({ axis, at }) => (
                <div
                  key={`${axis}${at}`}
                  className={`label-editor__guide label-editor__guide--${axis}`}
                  style={
                    axis === "x" ? { left: `${at}mm` } : { top: `${at}mm` }
                  }
                />
              ))}
              {marquee && (
                <div
                  className="label-editor__marquee"
                  style={rectStyle(marquee)}
                />
              )}
            </div>
          </LabelCard>
        </div>
      </div>
    </div>
  );
}
