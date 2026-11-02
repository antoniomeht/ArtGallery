import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
  BackupInfo,
  BackupOrigin,
  RestoreResult,
} from "../../shared/backup";
import type { ImageStore } from "../images/imageStore";
import type { InventoryService } from "../inventory/inventoryService";
import { toExportArtwork } from "../package/exportArtwork";
import { PACKAGE_EXTENSION, PackageError } from "../package/packageFormat";
import { readManifest, readPackage } from "../package/readPackage";
import { restoredArtworks } from "../package/restoredArtworks";
import { writePackage } from "../package/writePackage";
import type { SettingsStore } from "../settings/settingsStore";

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS = { daily: DAY_MS, weekly: 7 * DAY_MS } as const;

/** File name suffix that records why a backup was made. */
const ORIGIN_SUFFIX: Record<BackupOrigin, string> = {
  manual: "manual",
  automatic: "auto",
  "before-restore": "before-restore",
};

export interface BackupServiceOptions {
  inventory: InventoryService;
  images: ImageStore;
  settings: SettingsStore;
  /** Used while no folder has been chosen in the settings. */
  defaultFolder: string;
  /** Scratch space for validating and restoring packages. */
  workDir: string;
  appVersion: string;
  now?: () => Date;
}

export class BackupService {
  private readonly now: () => Date;

  constructor(private readonly options: BackupServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async folder(): Promise<string> {
    const { backupFolder } = await this.options.settings.read();
    return backupFolder ?? this.options.defaultFolder;
  }

  /**
   * Writes the whole inventory, trash included, and reads the file back to
   * check every image before reporting success.
   */
  async createBackup(origin: BackupOrigin = "manual"): Promise<BackupInfo> {
    const folder = await this.folder();
    await mkdir(folder, { recursive: true });
    const path = this.availablePath(folder, origin);
    const { inventory, images, appVersion } = this.options;

    await writePackage(path, {
      kind: "backup",
      artworks: inventory
        .listAllArtworks()
        .map((artwork) => toExportArtwork(artwork, images)),
      exhibitions: inventory.listAllExhibitions(),
      appVersion,
      now: this.now(),
    });
    try {
      await this.withStaging((staging) => readPackage(path, staging));
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    return (await this.describe(path))!;
  }

  /** Backups in the current folder, newest first. */
  async listBackups(): Promise<BackupInfo[]> {
    const folder = await this.folder();
    let names: string[];
    try {
      names = await readdir(folder);
    } catch {
      return [];
    }
    const backups = await Promise.all(
      names
        .filter((name) => name.endsWith(PACKAGE_EXTENSION))
        .map((name) => this.describe(join(folder, name))),
    );
    return backups
      .filter((backup): backup is BackupInfo => backup !== null)
      .sort((a, b) => sortTime(b) - sortTime(a));
  }

  /** Creates an automatic backup when one is due, then applies retention. */
  async runAutomaticIfDue(): Promise<BackupInfo | null> {
    const { autoBackup } = await this.options.settings.read();
    if (autoBackup === "off") return null;
    if (this.options.inventory.listAllArtworks().length === 0) return null;

    const last = (await this.listBackups()).find(
      (backup) => backup.origin === "automatic" && backup.readable,
    );
    const lastTime = last ? sortTime(last) : 0;
    if (this.now().getTime() - lastTime < INTERVAL_MS[autoBackup]) return null;

    const backup = await this.createBackup("automatic");
    await this.pruneAutomatic();
    return backup;
  }

  /** Keeps the newest automatic backups. Manual ones are never deleted. */
  async pruneAutomatic(): Promise<void> {
    const { keepAutomaticBackups } = await this.options.settings.read();
    const automatic = (await this.listBackups()).filter(
      (backup) => backup.origin === "automatic",
    );
    await Promise.all(
      automatic
        .slice(keepAutomaticBackups)
        .map((backup) => rm(backup.path, { force: true })),
    );
  }

  /**
   * Validates the whole backup before touching anything, saves the current
   * inventory as a safety backup and only then replaces it.
   */
  async restore(path: string): Promise<RestoreResult> {
    return this.withStaging(async (staging) => {
      let backup;
      try {
        backup = await readPackage(path, staging);
      } catch (error) {
        if (error instanceof PackageError) {
          return { ok: false, reason: error.code };
        }
        throw error;
      }
      if (backup.manifest.kind !== "backup") {
        return { ok: false, reason: "not-a-backup" };
      }

      const { inventory } = this.options;
      const safety =
        inventory.listAllArtworks().length > 0
          ? await this.createBackup("before-restore")
          : null;
      await inventory.replaceInventory(
        restoredArtworks(backup, backup.data.artworks),
        backup.data.exhibitions,
      );
      return { ok: true, safetyBackup: safety?.fileName ?? null };
    });
  }

  private async describe(path: string): Promise<BackupInfo | null> {
    const fileName = path.split(/[\\/]/).pop()!;
    const origin = originOf(fileName);
    const { size: bytes } = await stat(path);
    try {
      const manifest = await readManifest(path);
      // Exported selections share the format but are not backups.
      if (manifest.kind !== "backup") return null;
      return {
        fileName,
        path,
        bytes,
        origin,
        readable: true,
        createdAt: manifest.createdAt,
        artworks: manifest.counts.artworks,
        images: manifest.counts.images,
      };
    } catch {
      return { fileName, path, bytes, origin, readable: false };
    }
  }

  private availablePath(folder: string, origin: BackupOrigin): string {
    const stamp = fileTimestamp(this.now());
    const base = `ArtGallery-${stamp}-${ORIGIN_SUFFIX[origin]}`;
    let path = join(folder, `${base}${PACKAGE_EXTENSION}`);
    for (let copy = 2; existsSync(path); copy++) {
      path = join(folder, `${base}-${copy}${PACKAGE_EXTENSION}`);
    }
    return path;
  }

  private async withStaging<T>(work: (staging: string) => Promise<T>) {
    const staging = join(this.options.workDir, `staging-${randomUUID()}`);
    try {
      return await work(staging);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
}

function originOf(fileName: string): BackupOrigin {
  const match = Object.entries(ORIGIN_SUFFIX).find(([, suffix]) =>
    new RegExp(`-${suffix}(-\\d+)?\\${PACKAGE_EXTENSION}$`).test(fileName),
  );
  return (match?.[0] as BackupOrigin | undefined) ?? "manual";
}

/** `2026-11-02-103015` in local time, readable in a file browser. */
function fileTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

const sortTime = (backup: BackupInfo) =>
  backup.readable ? Date.parse(backup.createdAt) : 0;
