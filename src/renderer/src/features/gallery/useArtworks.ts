import { useCallback, useEffect, useState } from "react";
import type { ArtworkSummary } from "../../../../shared/artwork";

export type ArtworksState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; artworks: ArtworkSummary[] };

export function useArtworks() {
  const [state, setState] = useState<ArtworksState>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    window.artGallery.listArtworks().then(
      (artworks) => isCurrent && setState({ status: "ready", artworks }),
      () => isCurrent && setState({ status: "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { state, reload };
}
