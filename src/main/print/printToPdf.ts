import { BrowserWindow, ipcMain } from "electron";
import { rename, rm, writeFile } from "node:fs/promises";
import { IpcChannel } from "../../shared/api";
import { printJobHash, type PrintJob } from "../../shared/print";
import { loadRenderer, PRELOAD_PATH } from "../windows";

const READY_TIMEOUT_MS = 60_000;

/** Windows waiting for their document to finish rendering, by contents id. */
const pending = new Map<number, () => void>();

/** Must be registered once, before any document is printed. */
export function handlePrintReady(): void {
  ipcMain.on(IpcChannel.printReady, (event) => {
    pending.get(event.sender.id)?.();
  });
}

/**
 * Renders a print job in a hidden window and saves it as PDF. The renderer
 * reports when every image has loaded, so nothing is printed half drawn.
 */
export async function printToPdf(
  job: PrintJob,
  destination: string,
): Promise<void> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const contentsId = window.webContents.id;
  try {
    const ready = new Promise<void>((resolve, reject) => {
      pending.set(contentsId, resolve);
      setTimeout(
        () => reject(new Error("The document took too long to render")),
        READY_TIMEOUT_MS,
      );
    });
    await loadRenderer(window, printJobHash(job));
    await ready;
    const pdf = await window.webContents.printToPDF({
      preferCSSPageSize: true,
      printBackground: true,
    });
    const temporary = `${destination}.partial`;
    await writeFile(temporary, pdf);
    await rename(temporary, destination).catch(async (error: unknown) => {
      await rm(temporary, { force: true });
      throw error;
    });
  } finally {
    pending.delete(contentsId);
    window.destroy();
  }
}
