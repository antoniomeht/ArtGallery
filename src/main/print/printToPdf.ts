import { BrowserWindow, ipcMain, type WebContents } from "electron";
import { rename, rm, writeFile } from "node:fs/promises";
import { IpcChannel } from "../../shared/api";
import { printJobHash, type PrintJob } from "../../shared/print";
import { loadRenderer, PRELOAD_PATH } from "../windows";
import type { HeaderFooterOptions } from "./documentPdfOptions";

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
 * Renders a print job in a hidden window and hands its contents to `use`.
 * The renderer reports when every image has loaded, so nothing is printed
 * half drawn.
 */
async function withRenderedJob<T>(
  job: PrintJob,
  use: (contents: WebContents) => Promise<T>,
): Promise<T> {
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
    return await use(window.webContents);
  } finally {
    pending.delete(contentsId);
    window.destroy();
  }
}

/** Renders a print job and saves it as PDF. */
export async function printToPdf(
  job: PrintJob,
  destination: string,
  headerFooter: HeaderFooterOptions = { displayHeaderFooter: false },
): Promise<void> {
  const pdf = await withRenderedJob(job, (contents) =>
    contents.printToPDF({
      preferCSSPageSize: true,
      printBackground: true,
      ...headerFooter,
    }),
  );
  const temporary = `${destination}.partial`;
  await writeFile(temporary, pdf);
  await rename(temporary, destination).catch(async (error: unknown) => {
    await rm(temporary, { force: true });
    throw error;
  });
}

/**
 * Renders a print job and opens the system print dialog. Resolves once the
 * user prints or cancels; false when nothing was printed.
 */
export function printWithDialog(
  job: PrintJob,
  options: { header?: string; footer?: string } = {},
): Promise<boolean> {
  return withRenderedJob(
    job,
    (contents) =>
      new Promise<boolean>((resolve) => {
        contents.print(
          { silent: false, printBackground: true, ...options },
          (success) => resolve(success),
        );
      }),
  );
}
