/** Why a package could not be read; shared by import and restore. */
export const PACKAGE_FAILURES = [
  "not-a-package",
  "unsupported-version",
  "unsafe-entry",
  "invalid-data",
  "missing-image",
  "corrupted-image",
] as const;
export type PackageFailure = (typeof PACKAGE_FAILURES)[number];

/** What to do with imported artworks that already exist in the inventory. */
export const DUPLICATE_POLICIES = ["skip", "replace", "copy"] as const;
export type DuplicatePolicy = (typeof DUPLICATE_POLICIES)[number];

export interface ImportPreview {
  /** Identifies the validated package until it is applied or cancelled. */
  sessionId: string;
  fileName: string;
  newCount: number;
  duplicates: { id: string; title: string }[];
  /** Artworks that were in the trash where the package was made. */
  trashedSkipped: number;
}

export type ImportPreviewResult =
  { ok: true; preview: ImportPreview } | { ok: false; reason: PackageFailure };

export interface ImportResult {
  added: number;
  replaced: number;
  skipped: number;
}

export interface ExportResult {
  path: string;
  artworks: number;
}
