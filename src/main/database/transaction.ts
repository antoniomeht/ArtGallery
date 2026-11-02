import type { DatabaseSync } from "node:sqlite";

/**
 * Runs `work` atomically: every statement is committed or none is. Inside a
 * transaction that is already open, `work` simply joins it, so operations of
 * several repositories can be combined into one.
 */
export function transaction<T>(db: DatabaseSync, work: () => T): T {
  if (db.isTransaction) return work();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
