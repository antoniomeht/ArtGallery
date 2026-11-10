import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writePackage } from "../package/writePackage";
import { SettingsStore } from "../settings/settingsStore";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { BackupService } from "./backupService";

const HOUR_MS = 60 * 60 * 1000;

/** The app as it runs on one computer: data folder plus backup folder. */
function openApp(
  root: string,
  clock = { now: Date.parse("2026-11-02T10:00:00Z") },
) {
  const dataDir = join(root, "data");
  const inventory = openInventory(dataDir);
  const backups = new BackupService({
    inventory: inventory.service,
    images: inventory.images,
    collections: inventory.collections,
    documents: inventory.documents,
    settings: new SettingsStore(join(dataDir, "settings.json")),
    defaultFolder: join(root, "Documents", "ArtGallery backups"),
    workDir: join(dataDir, "tmp"),
    appVersion: "0.1.0",
    now: () => new Date(clock.now),
  });
  return { ...inventory, backups, clock, dataDir };
}

async function addArtwork(app: ReturnType<typeof openApp>, title: string) {
  const photo = await createTestImage(join(app.dataDir, `${title}.jpg`));
  return app.service.createArtwork({ title, imagePaths: [photo] });
}

describe("backups", () => {
  it("restores the inventory after the app data was deleted", async () => {
    const root = await useTempDir();
    const before = openApp(root);
    const marina = await addArtwork(before, "Marina");
    before.service.updateArtwork(marina.id, {
      title: "Marina",
      artist: "Lucía Ferrer",
      tags: ["mar"],
      price: 900,
    });
    const retrato = await addArtwork(before, "Retrato");
    before.service.moveToTrash([retrato.id]);
    const original = before.service.getArtwork(marina.id);
    const originalBytes = await readFile(
      before.images.originalPath(original.images[0]!.fileName),
    );
    await before.backups.createBackup();
    before.db.close();

    // Uninstalling and reinstalling may wipe the data folder entirely.
    await rm(join(root, "data"), { recursive: true });
    const after = openApp(root);
    expect(after.service.listArtworks()).toEqual([]);

    const [backup] = await after.backups.listBackups();
    expect(backup).toMatchObject({ readable: true, artworks: 2, images: 2 });
    expect(await after.backups.restore(backup!.path)).toEqual({
      ok: true,
      safetyBackup: null,
    });

    const restored = after.service.getArtwork(marina.id);
    expect(restored).toMatchObject({
      title: "Marina",
      artist: "Lucía Ferrer",
      tags: ["mar"],
      price: 900,
      createdAt: original.createdAt,
    });
    expect(
      await readFile(after.images.originalPath(restored.images[0]!.fileName)),
    ).toEqual(originalBytes);
    expect(after.service.listTrash().map((a) => a.title)).toEqual(["Retrato"]);
    after.db.close();
  });

  it("brings exhibitions back with their artworks in order", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    const marina = await addArtwork(app, "Marina");
    const retrato = await addArtwork(app, "Retrato");
    const { id } = app.exhibitions.create({ name: "Colección", venue: "Sala" });
    app.exhibitions.addArtworks(id, [retrato.id, marina.id]);
    const backup = await app.backups.createBackup();
    app.exhibitions.delete(id);

    await app.backups.restore(backup.path);

    expect(app.exhibitions.get(id)).toMatchObject({
      name: "Colección",
      venue: "Sala",
      artworkIds: [retrato.id, marina.id],
    });
    app.db.close();
  });

  it("saves the current inventory before replacing it", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    await addArtwork(app, "Marina");
    const backup = await app.backups.createBackup();
    await addArtwork(app, "Retrato");

    const result = await app.backups.restore(backup.path);

    expect(result).toMatchObject({ ok: true });
    expect(app.service.listArtworks().map((a) => a.title)).toEqual(["Marina"]);
    const safety = (await app.backups.listBackups()).find(
      (b) => b.origin === "before-restore",
    );
    expect(safety).toMatchObject({ artworks: 2 });
    // Images of the replaced inventory are gone; only the restored one stays.
    expect(
      await listFiles(join(app.dataDir, "images", "originals")),
    ).toHaveLength(1);
    app.db.close();
  });

  it("leaves the inventory untouched when the backup is damaged", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    await addArtwork(app, "Marina");
    const damaged = join(root, "damaged.artgallery");
    await writeFile(damaged, "not a zip");

    expect(await app.backups.restore(damaged)).toEqual({
      ok: false,
      reason: "not-a-package",
    });
    expect(app.service.listArtworks().map((a) => a.title)).toEqual(["Marina"]);
    expect(await readdir(join(app.dataDir, "tmp"))).toEqual([]);
    app.db.close();
  });

  it("does not restore a package that only holds a selection", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    await addArtwork(app, "Marina");
    const selection = join(root, "selection.artgallery");
    await writePackage(selection, {
      kind: "artworks",
      artworks: [],
      appVersion: "0.1.0",
    });

    expect(await app.backups.restore(selection)).toEqual({
      ok: false,
      reason: "not-a-backup",
    });
    expect(app.service.listArtworks()).toHaveLength(1);
    app.db.close();
  });

  it("makes automatic backups only when due, enabled and not empty", async () => {
    const root = await useTempDir();
    const app = openApp(root);

    expect(await app.backups.runAutomaticIfDue()).toBeNull();
    await addArtwork(app, "Marina");
    expect(await app.backups.runAutomaticIfDue()).toMatchObject({
      origin: "automatic",
    });

    app.clock.now += 23 * HOUR_MS;
    expect(await app.backups.runAutomaticIfDue()).toBeNull();
    app.clock.now += 2 * HOUR_MS;
    expect(await app.backups.runAutomaticIfDue()).not.toBeNull();

    await new SettingsStore(join(app.dataDir, "settings.json")).update({
      autoBackup: "off",
    });
    app.clock.now += 48 * HOUR_MS;
    expect(await app.backups.runAutomaticIfDue()).toBeNull();
    app.db.close();
  });

  it("keeps the newest automatic backups and every manual one", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    await new SettingsStore(join(app.dataDir, "settings.json")).update({
      keepAutomaticBackups: 2,
    });
    await addArtwork(app, "Marina");
    await app.backups.createBackup("manual");

    for (let day = 0; day < 4; day++) {
      app.clock.now += 25 * HOUR_MS;
      await app.backups.runAutomaticIfDue();
    }

    const backups = await app.backups.listBackups();
    expect(backups.map((b) => b.origin)).toEqual([
      "automatic",
      "automatic",
      "manual",
    ]);
    app.db.close();
  });

  it("writes backups to the folder chosen in the settings", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    const chosen = join(root, "External drive", "Copias");
    await new SettingsStore(join(app.dataDir, "settings.json")).update({
      backupFolder: chosen,
    });
    await addArtwork(app, "Marina");

    const backup = await app.backups.createBackup();

    expect(backup.path.startsWith(chosen)).toBe(true);
    expect(await readdir(chosen)).toEqual([backup.fileName]);
    app.db.close();
  });

  it("lists unreadable files instead of hiding them", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    const folder = await app.backups.folder();
    await addArtwork(app, "Marina");
    await app.backups.createBackup();
    await writeFile(join(folder, "copied-by-hand.artgallery"), "broken");

    const backups = await app.backups.listBackups();

    expect(backups.map((b) => b.readable)).toEqual([true, false]);
    app.db.close();
  });
});
