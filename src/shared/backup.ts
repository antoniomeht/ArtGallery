import type { PackageFailure } from "./transfer";

export type BackupOrigin = "manual" | "automatic" | "before-restore";

export type BackupInfo = {
  fileName: string;
  path: string;
  bytes: number;
  origin: BackupOrigin;
} & (
  | { readable: true; createdAt: string; artworks: number; images: number }
  /** The file is in the folder but cannot be read as a backup. */
  | { readable: false }
);

/** Why a backup could not be restored, so the interface can explain it. */
export type RestoreFailure = PackageFailure | "not-a-backup";

export type RestoreResult =
  | { ok: true; safetyBackup: string | null }
  | { ok: false; reason: RestoreFailure };
