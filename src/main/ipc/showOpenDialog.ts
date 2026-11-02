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
