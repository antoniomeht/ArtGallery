import { useEffect, useState } from "react";
import type { DimensionUnit } from "../../../shared/dimensions";

/** The unit chosen in the settings; null until it is known. */
export function useDimensionUnit(): DimensionUnit | null {
  const [unit, setUnit] = useState<DimensionUnit | null>(null);

  useEffect(() => {
    window.artGallery.getSettings().then(
      ({ dimensionUnit }) => setUnit(dimensionUnit),
      () => setUnit("cm"),
    );
  }, []);

  return unit;
}
