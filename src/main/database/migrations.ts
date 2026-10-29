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
];

export const LATEST_SCHEMA_VERSION = migrations.length;

export function getSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  return row.user_version;
}

export function migrate(db: DatabaseSync): void {
  const current = getSchemaVersion(db);
  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `The database uses schema v${current}, newer than this app (v${LATEST_SCHEMA_VERSION}). Update ArtGallery to open it.`,
    );
  }

  migrations.slice(current).forEach((sql, index) => {
    transaction(db, () => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${current + index + 1}`);
    });
  });
}
