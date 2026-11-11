import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { SettingsStore } from "./settingsStore";

describe("SettingsStore", () => {
  it("uses defaults until something is saved", async () => {
    const store = new SettingsStore(join(await useTempDir(), "settings.json"));

    expect(await store.read()).toEqual({
      backupFolder: null,
      autoBackup: "daily",
      keepAutomaticBackups: 10,
      defaultArtist: "",
      dimensionUnit: "cm",
      numberRanges: [],
    });
  });

  it("reads settings saved before a field existed", async () => {
    const file = join(await useTempDir(), "settings.json");
    await writeFile(file, JSON.stringify({ autoBackup: "weekly" }));

    expect(await new SettingsStore(file).read()).toMatchObject({
      autoBackup: "weekly",
      defaultArtist: "",
    });
  });

  it("keeps saved changes", async () => {
    const file = join(await useTempDir(), "settings.json");
    await new SettingsStore(file).update({ autoBackup: "weekly" });

    expect(await new SettingsStore(file).read()).toMatchObject({
      autoBackup: "weekly",
      keepAutomaticBackups: 10,
    });
    expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({
      autoBackup: "weekly",
    });
  });

  it("falls back to defaults when the file is damaged", async () => {
    const file = join(await useTempDir(), "settings.json");
    await writeFile(file, "{ not json");

    expect((await new SettingsStore(file).read()).autoBackup).toBe("daily");
  });

  it("rejects invalid values", async () => {
    const store = new SettingsStore(join(await useTempDir(), "settings.json"));

    await expect(store.update({ keepAutomaticBackups: 0 })).rejects.toThrow();
  });
});
