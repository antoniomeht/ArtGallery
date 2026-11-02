import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import {
  ARTWORK_STATUSES,
  type ArtworkFieldsInput,
  type ArtworkQuery,
  type NewArtwork,
} from "../../shared/artwork";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../images/imageStore";
import type { InventoryService } from "../inventory/inventoryService";
import { showOpenDialog } from "./showOpenDialog";

const artworkIdsSchema = z.array(z.string().min(1)).max(10_000);

export function registerIpcHandlers(inventory: InventoryService): void {
  ipcMain.handle(IpcChannel.listArtworks, (_event, query?: ArtworkQuery) =>
    inventory.listArtworks(query),
  );
  ipcMain.handle(IpcChannel.listFilterOptions, () =>
    inventory.listFilterOptions(),
  );
  ipcMain.handle(
    IpcChannel.setStatus,
    (_event, ids: unknown, status: unknown) =>
      inventory.setStatus(
        artworkIdsSchema.parse(ids),
        z.enum(ARTWORK_STATUSES).parse(status),
      ),
  );

  ipcMain.handle(IpcChannel.getArtwork, (_event, id: string) =>
    inventory.getArtwork(id),
  );

  // Payloads are validated by the service before anything is written.
  ipcMain.handle(IpcChannel.createArtwork, (_event, input: NewArtwork) =>
    inventory.createArtwork(input),
  );
  ipcMain.handle(
    IpcChannel.updateArtwork,
    (_event, id: string, fields: ArtworkFieldsInput) =>
      inventory.updateArtwork(id, fields),
  );
  ipcMain.handle(
    IpcChannel.addImages,
    (_event, artworkId: string, imagePaths: string[]) =>
      inventory.addImages(artworkId, imagePaths),
  );
  ipcMain.handle(
    IpcChannel.removeImage,
    (_event, artworkId: string, imageId: string) =>
      inventory.removeImage(artworkId, imageId),
  );
  ipcMain.handle(
    IpcChannel.setPrimaryImage,
    (_event, artworkId: string, imageId: string) =>
      inventory.setPrimaryImage(artworkId, imageId),
  );

  ipcMain.handle(IpcChannel.listTrash, () => inventory.listTrash());
  ipcMain.handle(IpcChannel.moveToTrash, (_event, ids: unknown) =>
    inventory.moveToTrash(artworkIdsSchema.parse(ids)),
  );
  ipcMain.handle(IpcChannel.restoreFromTrash, (_event, ids: unknown) =>
    inventory.restoreFromTrash(artworkIdsSchema.parse(ids)),
  );
  ipcMain.handle(IpcChannel.deleteFromTrash, (_event, ids: unknown) =>
    inventory.deleteFromTrash(artworkIdsSchema.parse(ids)),
  );
  ipcMain.handle(IpcChannel.emptyTrash, () => inventory.deleteFromTrash());

  ipcMain.handle(IpcChannel.pickImages, (event) =>
    showOpenDialog(event.sender, {
      title: "Elegir imágenes",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Imágenes",
          extensions: SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.slice(1)),
        },
      ],
    }),
  );
}
