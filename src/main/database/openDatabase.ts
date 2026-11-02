import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrations";

/** Accent- and case-insensitive key, so "Ángel" sorts next to "angel". */
function sortKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

export function openDatabase(filePath: string): DatabaseSync {
  const db = new DatabaseSync(filePath);
  // WAL keeps the database consistent if the app crashes mid-write.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.function("sort_key", { deterministic: true }, sortKey);
  migrate(db, {
    backupPath: (fromVersion) =>
      filePath.replace(/\.sqlite$/, `.before-update-v${fromVersion}.sqlite`),
  });
  return db;
}
