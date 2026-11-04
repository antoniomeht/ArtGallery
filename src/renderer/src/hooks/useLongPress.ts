import { useEffect, useRef, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;

/**
 * Detects holding the pointer down on an element. A long press is followed by
 * a click when the pointer is released, so `consumeClick` tells the element's
 * click handler to ignore that one.
 */
export function useLongPress<T>(onLongPress: (target: T) => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const didFire = useRef(false);
  const latest = useRef(onLongPress);
  useEffect(() => {
    latest.current = onLongPress;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const cancel = () => clearTimeout(timer.current);

  return {
    pressHandlers: (target: T) => ({
      onPointerDown: (event: PointerEvent) => {
        if (event.button !== 0) return;
        didFire.current = false;
        cancel();
        timer.current = setTimeout(() => {
          didFire.current = true;
          latest.current(target);
        }, LONG_PRESS_MS);
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    }),
    consumeClick: () => {
      const shouldIgnore = didFire.current;
      didFire.current = false;
      return shouldIgnore;
    },
  };
}
