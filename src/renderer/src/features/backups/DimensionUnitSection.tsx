import {
  DIMENSION_UNITS,
  type DimensionUnit,
} from "../../../../shared/dimensions";

const UNIT_LABELS: Record<DimensionUnit, string> = {
  cm: "Centímetros (cm)",
  in: "Pulgadas (in)",
};

interface DimensionUnitSectionProps {
  value: DimensionUnit;
  onChange: (unit: DimensionUnit) => void;
}

export function DimensionUnitSection({
  value,
  onChange,
}: DimensionUnitSectionProps) {
  return (
    <section className="page-section" aria-labelledby="dimension-unit">
      <h2 id="dimension-unit" className="page-section__title">
        Unidad de medida
      </h2>
      <fieldset className="segmented" aria-labelledby="dimension-unit">
        {DIMENSION_UNITS.map((unit) => (
          <label key={unit} className="segmented__option">
            <input
              type="radio"
              name="dimension-unit"
              value={unit}
              checked={value === unit}
              onChange={() => onChange(unit)}
            />
            {UNIT_LABELS[unit]}
          </label>
        ))}
      </fieldset>
      <p className="page-section__hint">
        Cómo se muestran y se escriben las medidas en toda la app. Cada obra
        guarda las dos, así que cambiarla no altera ningún dato.
      </p>
    </section>
  );
}
