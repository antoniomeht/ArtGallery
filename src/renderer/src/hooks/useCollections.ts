import { useCallback, useEffect, useState } from "react";
import type { CollectionSummary } from "../../../shared/collection";

/**
 * Collections by name. Reloads on demand, or whenever `externalVersion`
 * changes because the inventory changed from outside.
 */
export function useCollections(externalVersion = 0) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void window.artGallery
      .listCollections()
      .then((list) => isCurrent && setCollections(list));
    return () => {
      isCurrent = false;
    };
  }, [version, externalVersion]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { collections, reload };
}
