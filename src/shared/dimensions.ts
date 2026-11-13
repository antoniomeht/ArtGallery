export const DIMENSION_UNITS = ["cm", "in"] as const;
export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

export const MEASURE_AXES = ["width", "height", "depth"] as const;
export type MeasureAxis = (typeof MEASURE_AXES)[number];

export type Measures = Record<MeasureAxis, number | null>;

export const AXIS_LABELS: Record<MeasureAxis, string> = {
  height: "Alto",
  width: "Ancho",
  depth: "Profundidad",
};

/**
 * Every artwork keeps its measures in both units: the one they were typed
 * in exactly, and the other converted. The settings choose which is shown.
 */
export type Dimensions = Record<DimensionUnit, Measures>;

const CM_PER_INCH = 2.54;

const NO_MEASURES: Measures = { height: null, width: null, depth: null };
export const EMPTY_DIMENSIONS: Dimensions = {
  cm: NO_MEASURES,
  in: NO_MEASURES,
};

const otherUnit = (unit: DimensionUnit): DimensionUnit =>
  unit === "cm" ? "in" : "cm";

function convert(value: number, to: DimensionUnit): number {
  return to === "cm" ? value * CM_PER_INCH : value / CM_PER_INCH;
}

/** Measures are shown, and typed back, with one decimal at most. */
export function roundMeasure(value: number): number {
  return Math.round(value * 10) / 10;
}

function mapMeasures(
  measures: Measures,
  map: (value: number, axis: MeasureAxis) => number | null,
): Measures {
  const result = { ...NO_MEASURES };
  for (const axis of MEASURE_AXES) {
    const value = measures[axis];
    result[axis] = value == null ? null : map(value, axis);
  }
  return result;
}

/** Both units from measures typed in `unit`. */
export function fromSingleUnit(
  measures: Measures,
  unit: DimensionUnit,
): Dimensions {
  const other = otherUnit(unit);
  return {
    [unit]: { ...measures },
    [other]: mapMeasures(measures, (value) => convert(value, other)),
  } as Dimensions;
}

/**
 * Saves measures typed in `unit` over `previous`. A measure typed as it was
 * shown keeps both stored values, so saving a record never drifts them.
 */
export function withEnteredMeasures(
  previous: Dimensions,
  unit: DimensionUnit,
  entered: Measures,
): Dimensions {
  const typed = fromSingleUnit(entered, unit);
  const result: Dimensions = { cm: { ...typed.cm }, in: { ...typed.in } };
  for (const axis of MEASURE_AXES) {
    const before = previous[unit][axis];
    if (before != null && entered[axis] === roundMeasure(before)) {
      result.cm[axis] = previous.cm[axis];
      result.in[axis] = previous.in[axis];
    }
  }
  return result;
}

const measureFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
});

/** Width first: "55 × 46 cm" or "55 × 46 × 4 cm"; null when one is missing. */
export function formatDimensions(
  dimensions: Dimensions,
  unit: DimensionUnit,
): string | null {
  const { height, width, depth } = dimensions[unit];
  if (height == null || width == null) return null;
  const parts = [width, height, depth].filter((value) => value != null);
  return `${parts.map((value) => measureFormat.format(value)).join(" × ")} ${unit}`;
}
