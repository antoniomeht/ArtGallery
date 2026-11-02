import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import type { ExhibitionService } from "../exhibitions/exhibitionService";

const id = z.string().min(1);
const artworkIds = z.array(z.string().min(1)).max(10_000);

/** Field payloads are validated by the service before anything is written. */
export function registerExhibitionHandlers(exhibitions: ExhibitionService) {
  ipcMain.handle(IpcChannel.listExhibitions, () => exhibitions.list());
  ipcMain.handle(IpcChannel.getExhibition, (_event, exhibitionId: unknown) =>
    exhibitions.get(id.parse(exhibitionId)),
  );
  ipcMain.handle(IpcChannel.createExhibition, (_event, fields) =>
    exhibitions.create(fields),
  );
  ipcMain.handle(
    IpcChannel.updateExhibition,
    (_event, exhibitionId: unknown, fields) =>
      exhibitions.update(id.parse(exhibitionId), fields),
  );
  ipcMain.handle(IpcChannel.deleteExhibition, (_event, exhibitionId: unknown) =>
    exhibitions.delete(id.parse(exhibitionId)),
  );
  ipcMain.handle(
    IpcChannel.setExhibitionArtworks,
    (_event, exhibitionId: unknown, ids: unknown) =>
      exhibitions.setArtworks(id.parse(exhibitionId), artworkIds.parse(ids)),
  );
  ipcMain.handle(
    IpcChannel.addToExhibition,
    (_event, exhibitionId: unknown, ids: unknown) =>
      exhibitions.addArtworks(id.parse(exhibitionId), artworkIds.parse(ids)),
  );
}
