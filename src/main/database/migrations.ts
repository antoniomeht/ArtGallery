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
  `
  -- Artworks in the trash keep all their data until deleted permanently.
  ALTER TABLE artworks ADD COLUMN deleted_at TEXT;
  CREATE INDEX artworks_deleted_at ON artworks (deleted_at);
  `,
  `
  CREATE TABLE exhibitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    venue TEXT,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE exhibition_artworks (
    exhibition_id TEXT NOT NULL REFERENCES exhibitions (id) ON DELETE CASCADE,
    artwork_id TEXT NOT NULL REFERENCES artworks (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (exhibition_id, artwork_id),
    UNIQUE (exhibition_id, position)
  );
  CREATE INDEX exhibition_artworks_artwork ON exhibition_artworks (artwork_id);
  `,
  `
  -- Created from images without filling in their record yet.
  ALTER TABLE artworks ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;
  `,
  `
  -- Measures in both units: the typed one as is, the other converted.
  ALTER TABLE artworks ADD COLUMN height_cm REAL;
  ALTER TABLE artworks ADD COLUMN width_cm REAL;
  ALTER TABLE artworks ADD COLUMN depth_cm REAL;
  ALTER TABLE artworks ADD COLUMN height_in REAL;
  ALTER TABLE artworks ADD COLUMN width_in REAL;
  ALTER TABLE artworks ADD COLUMN depth_in REAL;
  UPDATE artworks SET
    height_cm = CASE dimension_unit WHEN 'cm' THEN height ELSE height * 2.54 END,
    width_cm = CASE dimension_unit WHEN 'cm' THEN width ELSE width * 2.54 END,
    depth_cm = CASE dimension_unit WHEN 'cm' THEN depth ELSE depth * 2.54 END,
    height_in = CASE dimension_unit WHEN 'in' THEN height ELSE height / 2.54 END,
    width_in = CASE dimension_unit WHEN 'in' THEN width ELSE width / 2.54 END,
    depth_in = CASE dimension_unit WHEN 'in' THEN depth ELSE depth / 2.54 END;
  ALTER TABLE artworks DROP COLUMN height;
  ALTER TABLE artworks DROP COLUMN width;
  ALTER TABLE artworks DROP COLUMN depth;
  ALTER TABLE artworks DROP COLUMN dimension_unit;
  `,
  `
  -- Named groups of artworks; an artwork can be in several.
  CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE collection_artworks (
    collection_id TEXT NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    artwork_id TEXT NOT NULL REFERENCES artworks (id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    PRIMARY KEY (collection_id, artwork_id)
  );
  CREATE INDEX collection_artworks_artwork ON collection_artworks (artwork_id);
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
