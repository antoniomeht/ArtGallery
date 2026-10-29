import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { getSchemaVersion, LATEST_SCHEMA_VERSION } from "./migrations";
import { openDatabase } from "./openDatabase";

describe("database migrations", () => {
  it("brings a new database to the latest schema", async () => {
    const db = openDatabase(join(await useTempDir(), "test.sqlite"));

    expect(getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    db.close();
  });

  it("keeps existing data when the database is opened again", async () => {
    const file = join(await useTempDir(), "test.sqlite");
    const first = openDatabase(file);
    first
      .prepare(
        "INSERT INTO artworks (id, title, created_at, updated_at) VALUES ('a1', 'Marina', 'now', 'now')",
      )
      .run();
    first.close();

    const second = openDatabase(file);
    expect(second.prepare("SELECT title FROM artworks").all()).toEqual([
      { title: "Marina" },
    ]);
    second.close();
  });

  it("refuses to open a database created by a newer version of the app", async () => {
    const file = join(await useTempDir(), "test.sqlite");
    const future = new DatabaseSync(file);
    future.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    future.close();

    expect(() => openDatabase(file)).toThrow(/newer than this app/);
  });
});
