import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { BackupService } from "./backup/backupService";
import { CollectionRepository } from "./collections/collectionRepository";
import { CollectionService } from "./collections/collectionService";
import { openDatabase } from "./database/openDatabase";
import { seedDemoInventory } from "./demo/demoInventory";
import { ExhibitionRepository } from "./exhibitions/exhibitionRepository";
import { ExhibitionService } from "./exhibitions/exhibitionService";
import { ImageStore } from "./images/imageStore";
import { ArtworkRepository } from "./inventory/artworkRepository";
import { InventoryService } from "./inventory/inventoryService";
import { registerBackupHandlers } from "./ipc/registerBackupHandlers";
import { registerCollectionHandlers } from "./ipc/registerCollectionHandlers";
import { registerExhibitionHandlers } from "./ipc/registerExhibitionHandlers";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { registerPrintHandlers } from "./ipc/registerPrintHandlers";
import { registerTransferHandlers } from "./ipc/registerTransferHandlers";
import {
  handleMediaRequests,
  registerMediaScheme,
} from "./media/mediaProtocol";
import { SettingsStore } from "./settings/settingsStore";
import { TransferService } from "./transfer/transferService";
import { loadRenderer, PRELOAD_PATH } from "./windows";

const HOUR_MS = 60 * 60 * 1000;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: "ArtGallery",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  // A file dropped outside a handled area must never replace the app.
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  // External links open in the system browser, never inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void loadRenderer(window);
  return window;
}

registerMediaScheme();

// `npm run demo` opens the app on its own data folder filled with fictional
// artworks, so it never touches real data. Only available in development.
const isDemo = !app.isPackaged && process.argv.includes("--demo");
if (isDemo) {
  const demoDir = join(app.getAppPath(), ".demo");
  app.setPath("userData", join(demoDir, "data"));
  app.setPath("documents", join(demoDir, "documents"));
}

void app.whenReady().then(async () => {
  // Per-user data folder: %APPDATA%\ArtGallery on Windows and
  // ~/Library/Application Support/ArtGallery on macOS.
  const dataDir = app.getPath("userData");
  const db = openDatabase(join(dataDir, "artgallery.sqlite"));
  const imageStore = new ImageStore(join(dataDir, "images"));
  const exhibitionRepository = new ExhibitionRepository(db);
  const inventory = new InventoryService({
    artworks: new ArtworkRepository(db),
    exhibitions: exhibitionRepository,
    images: imageStore,
  });
  const exhibitions = new ExhibitionService(exhibitionRepository);
  const collections = new CollectionService(new CollectionRepository(db));
  const settings = new SettingsStore(join(dataDir, "settings.json"));
  // Backups live outside the app data, so they survive an uninstall that
  // removes it, and are easy to find and copy elsewhere.
  const backups = new BackupService({
    inventory,
    images: imageStore,
    settings,
    defaultFolder: join(
      app.getPath("documents"),
      "ArtGallery",
      "Copias de seguridad",
    ),
    workDir: join(dataDir, "tmp"),
    appVersion: app.getVersion(),
  });

  const transfer = new TransferService({
    inventory,
    exhibitions,
    images: imageStore,
    workDir: join(dataDir, "tmp"),
    appVersion: app.getVersion(),
  });

  if (isDemo) {
    await seedDemoInventory({
      inventory,
      exhibitions,
      workDir: join(dataDir, "tmp", "demo"),
    });
  }

  handleMediaRequests(imageStore);
  registerIpcHandlers(inventory, settings);
  registerExhibitionHandlers(exhibitions);
  registerCollectionHandlers(collections);
  registerPrintHandlers(exhibitions);
  registerBackupHandlers({ backups, settings, dataFolder: dataDir });
  registerTransferHandlers(transfer);
  createMainWindow();

  const runAutomaticBackup = () =>
    backups
      .runAutomaticIfDue()
      .catch((error: unknown) =>
        console.error("Automatic backup failed", error),
      );
  setTimeout(runAutomaticBackup, 10_000);
  setInterval(runAutomaticBackup, HOUR_MS);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
  app.on("will-quit", () => db.close());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
