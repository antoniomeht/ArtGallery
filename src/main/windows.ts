import { app, type BrowserWindow } from "electron";
import { join } from "node:path";

export const PRELOAD_PATH = join(__dirname, "../preload/index.js");

/** Loads the renderer, from the dev server or the built files. */
export function loadRenderer(window: BrowserWindow, hash = ""): Promise<void> {
  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!app.isPackaged && devServerUrl) {
    return window.loadURL(`${devServerUrl}${hash}`);
  }
  return window.loadFile(join(__dirname, "../renderer/index.html"), {
    hash: hash.replace(/^#/, ""),
  });
}
