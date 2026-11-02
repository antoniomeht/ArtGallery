import { useCallback, useEffect, useState } from "react";
import type { ArtworkSummary } from "../../../shared/artwork";

export type ArtworkListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; artworks: ArtworkSummary[] };

/** Loads a list of artworks with `load` and reloads it on demand. */
export function useArtworkList(load: () => Promise<ArtworkSummary[]>) {
  const [state, setState] = useState<ArtworkListState>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    load().then(
      (artworks) => isCurrent && setState({ status: "ready", artworks }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { state, reload };
}
