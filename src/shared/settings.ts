import { z } from "zod";

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
});

export type Settings = z.output<typeof settingsSchema>;
