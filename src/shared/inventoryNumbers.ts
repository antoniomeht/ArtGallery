import { z } from "zod";
import { foldText } from "./text";

/** How the main process names a number another artwork already has. */
export const INVENTORY_NUMBER_TAKEN = "Inventory number taken";

const rangeNumber = z.number().int().min(0).max(999_999);

/** Inventory numbers kept for each technique, e.g. óleo 1–199. */
export const numberRangesSchema = z
  .array(
    z
      .object({
        technique: z.string().trim().min(1).max(200),
        from: rangeNumber,
        to: rangeNumber,
      })
      .refine(({ from, to }) => from <= to, {
        message: "The range ends before it starts",
        path: ["to"],
      }),
  )
  .max(100)
  .default([]);

export type NumberRanges = z.output<typeof numberRangesSchema>;
export type NumberRange = NumberRanges[number];

/** At least three digits, or as many as the end of the range has. */
export function formatInventoryNumber(
  value: number,
  range: NumberRange,
): string {
  const digits = Math.max(3, String(range.to).length);
  return String(value).padStart(digits, "0");
}

/**
 * The first number of the technique's range that no artwork uses yet, or
 * null when the technique has no range or its range is full. Numbers are
 * compared by value, so "7" and "007" are the same number.
 */
export function nextInventoryNumber(
  ranges: NumberRanges,
  technique: string | null,
  used: readonly (string | null)[],
): string | null {
  if (!technique) return null;
  const folded = foldText(technique);
  const range = ranges.find((r) => foldText(r.technique) === folded);
  if (!range) return null;
  const taken = new Set(
    used
      .filter(
        (number): number is string => !!number && /^\d+$/.test(number.trim()),
      )
      .map((number) => Number(number.trim())),
  );
  for (let value = range.from; value <= range.to; value++) {
    if (!taken.has(value)) return formatInventoryNumber(value, range);
  }
  return null;
}
