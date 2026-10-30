import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrations";

export function openDatabase(filePath: string): DatabaseSync {
  const db = new DatabaseSync(filePath);
  // WAL keeps the database consistent if the app crashes mid-write.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}
