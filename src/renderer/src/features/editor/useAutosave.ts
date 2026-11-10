import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "error";

/** Writing pauses longer than this are saved. */
const SAVE_DELAY_MS = 800;

/**
 * Saves the latest value a short while after the last change, and right
 * away when the view closes, so nothing typed is lost.
 */
export function useAutosave<T>(save: (value: T) => Promise<unknown>) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  /** Counts saves, so views that depend on the saved text can reload. */
  const [savedVersion, setSavedVersion] = useState(0);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      await saveRef.current(next.value);
      setStatus(pending.current ? "saving" : "saved");
      setSavedVersion((current) => current + 1);
    } catch {
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => () => void flush(), [flush]);

  return { status, savedVersion, schedule, flush };
}
