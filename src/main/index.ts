import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { openDatabase } from "./database/openDatabase";
import { ImageStore } from "./images/imageStore";
import { ArtworkRepository } from "./inventory/artworkRepository";
import { InventoryService } from "./inventory/inventoryService";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import {
  handleMediaRequests,
  registerMediaScheme,
} from "./media/mediaProtocol";

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
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  // External links open in the system browser, never inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

registerMediaScheme();

void app.whenReady().then(() => {
  // Per-user data folder: %APPDATA%\ArtGallery on Windows and
  // ~/Library/Application Support/ArtGallery on macOS.
  const dataDir = app.getPath("userData");
  const db = openDatabase(join(dataDir, "artgallery.sqlite"));
  const imageStore = new ImageStore(join(dataDir, "images"));
  const inventory = new InventoryService(new ArtworkRepository(db), imageStore);

  handleMediaRequests(imageStore);
  registerIpcHandlers(inventory);
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
  app.on("will-quit", () => db.close());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
