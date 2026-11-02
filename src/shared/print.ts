import { z } from "zod";

/** A document the print window renders and saves as PDF. */
export const printJobSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog"),
    exhibitionId: z.string().min(1),
    includePrices: z.boolean(),
  }),
]);

export type PrintJob = z.infer<typeof printJobSchema>;

const HASH_PREFIX = "#print?";

/** The print window loads the renderer with the job in the URL hash. */
export function printJobHash(job: PrintJob): string {
  return `${HASH_PREFIX}${encodeURIComponent(JSON.stringify(job))}`;
}

/** Reads the job from a URL hash, or null for the normal app window. */
export function readPrintJob(hash: string): PrintJob | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const json: unknown = JSON.parse(
      decodeURIComponent(hash.slice(HASH_PREFIX.length)),
    );
    return printJobSchema.parse(json);
  } catch {
    return null;
  }
}
