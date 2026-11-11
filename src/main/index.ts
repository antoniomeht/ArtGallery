import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "node:path";
import { BackupService } from "./backup/backupService";
import { CollectionRepository } from "./collections/collectionRepository";
import { CollectionService } from "./collections/collectionService";
import { openDatabase } from "./database/openDatabase";
import { DocumentRepository } from "./documents/documentRepository";
import { DocumentService } from "./documents/documentService";
import { DocumentStore } from "./documents/documentStore";
import { seedDemoInventory } from "./demo/demoInventory";
import { ExhibitionRepository } from "./exhibitions/exhibitionRepository";
import { ExhibitionService } from "./exhibitions/exhibitionService";
import { ImageStore } from "./images/imageStore";
import { ArtworkRepository } from "./inventory/artworkRepository";
import { InventoryService } from "./inventory/inventoryService";
import { registerBackupHandlers } from "./ipc/registerBackupHandlers";
import { registerCollectionHandlers } from "./ipc/registerCollectionHandlers";
import { registerDocumentHandlers } from "./ipc/registerDocumentHandlers";
import { registerExhibitionHandlers } from "./ipc/registerExhibitionHandlers";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { registerPrintHandlers } from "./ipc/registerPrintHandlers";
import { registerTransferHandlers } from "./ipc/registerTransferHandlers";
import { registerUpdateHandlers } from "./ipc/registerUpdateHandlers";
import {
  handleMediaRequests,
  registerMediaScheme,
} from "./media/mediaProtocol";
import { SettingsStore } from "./settings/settingsStore";
import { TransferService } from "./transfer/transferService";
import { isSafeHref } from "../shared/editorSchema";
import { contextMenuItems } from "./spelling/contextMenu";
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

  // Opens using the whole screen; un-maximizing returns to the size above.
  window.once("ready-to-show", () => {
    window.maximize();
    window.show();
  });

  // A file dropped outside a handled area must never replace the app.
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  // Web and email links open outside the app; nothing else opens at all.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeHref(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  // Corrections from the system's spell checker, in Spanish, and the usual
  // editing commands on right click.
  window.webContents.session.setSpellCheckerLanguages(["es-ES"]);
  window.webContents.on("context-menu", (_event, params) => {
    const items = contextMenuItems(params, {
      replaceMisspelling: (word) => window.webContents.replaceMisspelling(word),
      addToDictionary: (word) =>
        window.webContents.session.addWordToSpellCheckerDictionary(word),
    });
    if (items.length > 0) Menu.buildFromTemplate(items).popup({ window });
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
  const documentStore = new DocumentStore(join(dataDir, "documents"));
  const documents = new DocumentService(
    new DocumentRepository(db),
    documentStore,
  );
  // Deleting could be undone until now.
  await documents
    .purgeDeleted()
    .catch((error: unknown) =>
      console.error("Purging deleted documents failed", error),
    );
  const settings = new SettingsStore(join(dataDir, "settings.json"));
  // Backups live outside the app data, so they survive an uninstall that
  // removes it, and are easy to find and copy elsewhere.
  const backups = new BackupService({
    inventory,
    images: imageStore,
    collections,
    documents,
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
    collections,
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

  handleMediaRequests(imageStore, documentStore);
  registerIpcHandlers(inventory, settings);
  registerExhibitionHandlers(exhibitions);
  registerCollectionHandlers(collections);
  registerDocumentHandlers(documents, imageStore);
  registerPrintHandlers(exhibitions, documents, join(dataDir, "tmp"));
  registerBackupHandlers({ backups, settings, dataFolder: dataDir });
  registerTransferHandlers(transfer);
  registerUpdateHandlers(settings, join(dataDir, "tmp", "update"));
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
