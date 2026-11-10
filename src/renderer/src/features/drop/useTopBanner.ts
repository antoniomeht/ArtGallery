import { useCallback, useEffect, useState } from "react";
import type { UploadResult } from "../../../../shared/document";

export interface Banner {
  tone: "success" | "error";
  message: string;
  /** What was uploaded, so the banner can lead to it. */
  result?: UploadResult;
}

/** Success is read at a glance; an error needs longer to read. */
export const BANNER_MS = { success: 5000, error: 8000 } as const;

/**
 * The banner at the top of the app. It hides itself after a while, except
 * while the pointer or the focus is on it.
 */
export function useTopBanner() {
  const [banner, setBanner] = useState<(Banner & { key: number }) | null>(null);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!banner || isHeld) return;
    const timer = setTimeout(() => setBanner(null), BANNER_MS[banner.tone]);
    return () => clearTimeout(timer);
  }, [banner, isHeld]);

  const show = useCallback(
    (next: Banner) => setBanner({ ...next, key: Date.now() }),
    [],
  );
  const dismiss = useCallback(() => setBanner(null), []);

  return { banner, show, dismiss, setIsHeld };
}
