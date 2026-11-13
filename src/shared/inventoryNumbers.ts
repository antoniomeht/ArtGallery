import { z } from "zod";
import { foldText } from "./text";

/** How the main process names a number another artwork already has. */
export const INVENTORY_NUMBER_TAKEN = "Inventory number taken";

/** The artwork that already has an inventory number. */
export interface InventoryNumberOwner {
  id: string;
  title: string;
  inTrash: boolean;
}

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
  range?: NumberRange,
): string {
  const digits = Math.max(3, String(range?.to ?? 0).length);
  return String(value).padStart(digits, "0");
}

/** The value of a number made only of digits, e.g. 7 for "007". */
function numericValue(number: string): number | null {
  const trimmed = number.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** "7" and "007" are the same number, as are "A-7" and "a-7". */
export function isSameInventoryNumber(a: string, b: string): boolean {
  const value = numericValue(a);
  if (value !== null) return value === numericValue(b);
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * The first number no artwork uses yet: within the technique's range when it
 * has one (null once the range is full), otherwise counting from 1. Numbers
 * are compared by value, so "7" and "007" are the same number.
 */
export function nextInventoryNumber(
  ranges: NumberRanges,
  technique: string | null,
  used: readonly (string | null)[],
): string | null {
  const folded = technique ? foldText(technique) : null;
  const range = ranges.find((r) => foldText(r.technique) === folded);
  const taken = new Set(
    used.map((number) => (number ? numericValue(number) : null)),
  );
  if (!range) {
    let value = 1;
    while (taken.has(value)) value++;
    return formatInventoryNumber(value);
  }
  for (let value = range.from; value <= range.to; value++) {
    if (!taken.has(value)) return formatInventoryNumber(value, range);
  }
  return null;
}
