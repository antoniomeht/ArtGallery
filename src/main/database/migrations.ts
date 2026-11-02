import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./transaction";

/**
 * Ordered schema migrations. The index + 1 is the schema version stored in
 * `PRAGMA user_version`. Never edit a released migration: append a new one.
 */
const migrations: readonly string[] = [
  `
  CREATE TABLE artworks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- position 0 is the primary image of the artwork.
  CREATE TABLE artwork_images (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL REFERENCES artworks (id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (artwork_id, position)
  );
  `,
  `
  ALTER TABLE artworks ADD COLUMN category TEXT;
  ALTER TABLE artworks ADD COLUMN technique TEXT;
  ALTER TABLE artworks ADD COLUMN support TEXT;
  ALTER TABLE artworks ADD COLUMN year INTEGER;
  ALTER TABLE artworks ADD COLUMN year_approximate INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE artworks ADD COLUMN height REAL;
  ALTER TABLE artworks ADD COLUMN width REAL;
  ALTER TABLE artworks ADD COLUMN depth REAL;
  ALTER TABLE artworks ADD COLUMN dimension_unit TEXT NOT NULL DEFAULT 'cm'
    CHECK (dimension_unit IN ('cm', 'in'));
  ALTER TABLE artworks ADD COLUMN description TEXT;
  ALTER TABLE artworks ADD COLUMN notes TEXT;
  ALTER TABLE artworks ADD COLUMN location TEXT;
  ALTER TABLE artworks ADD COLUMN status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'exhibited', 'loaned', 'sold', 'other'));
  -- Prices are stored in cents to avoid floating point rounding.
  ALTER TABLE artworks ADD COLUMN price_cents INTEGER;
  ALTER TABLE artworks ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';

  CREATE TABLE artwork_tags (
    artwork_id TEXT NOT NULL REFERENCES artworks (id) ON DELETE CASCADE,
    tag TEXT NOT NULL COLLATE NOCASE,
    PRIMARY KEY (artwork_id, tag)
  );
  `,
];

export const LATEST_SCHEMA_VERSION = migrations.length;

export function getSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  return row.user_version;
}

/**
 * Applies pending migrations up to `targetVersion`. Before touching a
 * database that already has a schema, a full copy is written to
 * `backupPath(currentVersion)` so an update can never lose data.
 */
export function migrate(
  db: DatabaseSync,
  {
    backupPath,
    targetVersion = LATEST_SCHEMA_VERSION,
  }: {
    backupPath?: (fromVersion: number) => string;
    targetVersion?: number;
  } = {},
): void {
  const current = getSchemaVersion(db);
  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `The database uses schema v${current}, newer than this app (v${LATEST_SCHEMA_VERSION}). Update ArtGallery to open it.`,
    );
  }
  if (current >= targetVersion) return;

  if (current > 0 && backupPath) {
    db.prepare("VACUUM INTO ?").run(backupPath(current));
  }

  migrations.slice(current, targetVersion).forEach((sql, index) => {
    transaction(db, () => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${current + index + 1}`);
    });
  });
}
