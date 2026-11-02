import { z } from "zod";

/** Optional free text: blank input is stored as null. */
export const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullish()
    .transform((value) => value || null);

/** Optional number: missing input is stored as null. */
export const optionalNumber = (schema: z.ZodNumber) =>
  schema.nullish().transform((value) => value ?? null);

/** Optional calendar date as `YYYY-MM-DD`: blank input is stored as null. */
export const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .nullish()
  .transform((value) => value || null);
