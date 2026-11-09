import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { existsSync } from "node:fs";
import { getSchemaVersion, LATEST_SCHEMA_VERSION, migrate } from "./migrations";
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

  it("keeps data and saves a copy before upgrading an older database", async () => {
    const file = join(await useTempDir(), "artgallery.sqlite");
    const v1 = new DatabaseSync(file);
    migrate(v1, { targetVersion: 1 });
    v1.prepare(
      "INSERT INTO artworks (id, title, created_at, updated_at) VALUES ('a1', 'Marina', 'now', 'now')",
    ).run();
    v1.close();

    const upgraded = openDatabase(file);

    expect(getSchemaVersion(upgraded)).toBe(LATEST_SCHEMA_VERSION);
    expect(
      upgraded
        .prepare("SELECT title, status, needs_review FROM artworks")
        .all(),
    ).toEqual([{ title: "Marina", status: "available", needs_review: 0 }]);
    upgraded.close();

    const backup = new DatabaseSync(
      file.replace(".sqlite", ".before-update-v1.sqlite"),
    );
    expect(getSchemaVersion(backup)).toBe(1);
    expect(backup.prepare("SELECT title FROM artworks").all()).toEqual([
      { title: "Marina" },
    ]);
    backup.close();
  });

  it("keeps measures in both units, converting from each artwork's unit", async () => {
    const file = join(await useTempDir(), "artgallery.sqlite");
    const before = new DatabaseSync(file);
    migrate(before, { targetVersion: LATEST_SCHEMA_VERSION - 1 });
    before.exec(`
      INSERT INTO artworks (id, title, height, width, dimension_unit, created_at, updated_at)
      VALUES ('cm', 'Marina', 46, 55, 'cm', 'now', 'now'),
             ('in', 'Boceto', 10, NULL, 'in', 'now', 'now')
    `);
    before.close();

    const upgraded = openDatabase(file);

    expect(
      upgraded
        .prepare(
          `SELECT id, height_cm, width_cm, height_in, width_in FROM artworks
           ORDER BY id`,
        )
        .all(),
    ).toEqual([
      {
        id: "cm",
        height_cm: 46,
        width_cm: 55,
        height_in: 46 / 2.54,
        width_in: 55 / 2.54,
      },
      {
        id: "in",
        height_cm: 25.4,
        width_cm: null,
        height_in: 10,
        width_in: null,
      },
    ]);
    upgraded.close();
  });

  it("does not create a backup for a brand-new database", async () => {
    const dir = await useTempDir();
    openDatabase(join(dir, "artgallery.sqlite")).close();

    expect(existsSync(join(dir, "artgallery.before-update-v0.sqlite"))).toBe(
      false,
    );
  });

  it("refuses to open a database created by a newer version of the app", async () => {
    const file = join(await useTempDir(), "test.sqlite");
    const future = new DatabaseSync(file);
    future.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    future.close();

    expect(() => openDatabase(file)).toThrow(/newer than this app/);
  });
});
