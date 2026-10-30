import { BrowserWindow, dialog, ipcMain } from "electron";
import { IpcChannel } from "../../shared/api";
import type { NewArtwork } from "../../shared/artwork";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../images/imageStore";
import type { InventoryService } from "../inventory/inventoryService";

export function registerIpcHandlers(inventory: InventoryService): void {
  ipcMain.handle(IpcChannel.listArtworks, () => inventory.listArtworks());

  // The payload is validated by the service before anything is written.
  ipcMain.handle(IpcChannel.createArtwork, (_event, input: NewArtwork) =>
    inventory.createArtwork(input),
  );

  ipcMain.handle(IpcChannel.pickImages, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: "Elegir imágenes",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Imágenes",
          extensions: SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.slice(1)),
        },
      ],
    };
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });
}
