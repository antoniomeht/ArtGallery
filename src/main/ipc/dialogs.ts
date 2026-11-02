import { BrowserWindow, dialog } from "electron";

/** Opens a file dialog attached to the window that asked for it. */
export async function showOpenDialog(
  sender: Electron.WebContents,
  options: Electron.OpenDialogOptions,
): Promise<string[]> {
  const window = BrowserWindow.fromWebContents(sender);
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  return result.canceled ? [] : result.filePaths;
}

/** Asks where to save a file; returns null if the user cancels. */
export async function showSaveDialog(
  sender: Electron.WebContents,
  options: Electron.SaveDialogOptions,
): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(sender);
  const result = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  return result.canceled || !result.filePath ? null : result.filePath;
}
