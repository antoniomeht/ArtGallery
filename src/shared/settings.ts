import { z } from "zod";
import { hiddenFieldsSchema } from "./categoryFields";
import { DIMENSION_UNITS } from "./dimensions";

export const AUTO_BACKUP_FREQUENCIES = ["off", "daily", "weekly"] as const;
export type AutoBackupFrequency = (typeof AUTO_BACKUP_FREQUENCIES)[number];

export const settingsSchema = z.object({
  /** Folder for backups; null means the default one in Documents. */
  backupFolder: z.string().min(1).nullable().default(null),
  autoBackup: z.enum(AUTO_BACKUP_FREQUENCIES).default("daily"),
  /** How many automatic backups to keep. Manual ones are never pruned. */
  keepAutomaticBackups: z.number().int().min(1).max(100).default(10),
  /** Filled in on every new artwork; empty leaves the artist blank. */
  defaultArtist: z.string().trim().max(300).default(""),
  /** How measures are shown and typed; artworks keep both units. */
  dimensionUnit: z.enum(DIMENSION_UNITS).default("cm"),
  /** Form fields each category leaves out; the data is kept. */
  hiddenFields: hiddenFieldsSchema,
});

export type Settings = z.output<typeof settingsSchema>;

/**
 * Checks a change to some settings. Settings left out stay out: a plain
 * `partial()` would fill them with their defaults and overwrite them.
 */
export function parseSettingsChanges(changes: unknown): Partial<Settings> {
  const parsed = settingsSchema.partial().parse(changes);
  const given = new Set(Object.keys(changes as object));
  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => given.has(key)),
  ) as Partial<Settings>;
}
