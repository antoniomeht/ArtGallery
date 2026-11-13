import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import {
  ARTWORK_STATUSES,
  type ArtworkFieldsInput,
  type ArtworkQuery,
} from "../../shared/artwork";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../../shared/media";
import type { InventoryService } from "../inventory/inventoryService";
import type { SettingsStore } from "../settings/settingsStore";
import { showOpenDialog } from "./dialogs";

const artworkIdsSchema = z.array(z.string().min(1)).max(10_000);

export function registerIpcHandlers(
  inventory: InventoryService,
  settings: SettingsStore,
): void {
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

  ipcMain.handle(
    IpcChannel.nextInventoryNumber,
    async (_event, technique: unknown) => {
      const { numberRanges } = await settings.read();
      return inventory.nextInventoryNumber(
        numberRanges,
        z.string().max(200).parse(technique),
      );
    },
  );

  ipcMain.handle(
    IpcChannel.inventoryNumberOwner,
    (_event, number: unknown, artworkId: unknown) =>
      inventory.inventoryNumberOwner(
        z.string().max(30).parse(number),
        z.string().min(1).parse(artworkId),
      ),
  );

  ipcMain.handle(
    IpcChannel.setFavorite,
    (_event, id: unknown, favorite: unknown) =>
      inventory.setFavorite(
        z.string().min(1).parse(id),
        z.boolean().parse(favorite),
      ),
  );

  ipcMain.handle(IpcChannel.getArtwork, (_event, id: string) =>
    inventory.getArtwork(id),
  );

  // Payloads are validated by the service before anything is written.
  ipcMain.handle(
    IpcChannel.createArtworksFromImages,
    async (event, imagePaths: string[]) => {
      const { defaultArtist } = await settings.read();
      return inventory.createArtworksFromImages(
        imagePaths,
        defaultArtist,
        (progress) =>
          event.sender.send(IpcChannel.onCreationProgress, progress),
      );
    },
  );
  ipcMain.handle(
    IpcChannel.updateArtwork,
    (_event, id: string, fields: ArtworkFieldsInput, options: unknown) =>
      inventory.updateArtwork(
        id,
        fields,
        z
          .object({ takeInventoryNumber: z.boolean().optional() })
          .optional()
          .parse(options),
      ),
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
