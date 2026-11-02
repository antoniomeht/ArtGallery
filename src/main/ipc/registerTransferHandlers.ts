import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import { DUPLICATE_POLICIES } from "../../shared/transfer";
import { PACKAGE_EXTENSION } from "../package/packageFormat";
import type { TransferService } from "../transfer/transferService";
import { showOpenDialog, showSaveDialog } from "./dialogs";

/** null exports every artwork outside the trash. */
const idsSchema = z.array(z.string().min(1)).max(10_000).nullable();
const PACKAGE_FILTER = {
  name: "Paquete de ArtGallery",
  extensions: [PACKAGE_EXTENSION.slice(1)],
};

const today = () => new Date().toISOString().slice(0, 10);

export function registerTransferHandlers(transfer: TransferService): void {
  ipcMain.handle(IpcChannel.exportPackage, async (event, ids: unknown) => {
    const selection = idsSchema.parse(ids);
    const path = await showSaveDialog(event.sender, {
      title: "Exportar obras",
      defaultPath: `ArtGallery-${selection ? "seleccion" : "obras"}-${today()}${PACKAGE_EXTENSION}`,
      filters: [PACKAGE_FILTER],
    });
    return path ? transfer.exportPackage(path, selection) : null;
  });

  ipcMain.handle(
    IpcChannel.exportExhibition,
    async (event, exhibitionId: unknown) => {
      const id = z.string().min(1).parse(exhibitionId);
      const path = await showSaveDialog(event.sender, {
        title: "Exportar exposición",
        defaultPath: `ArtGallery-exposicion-${today()}${PACKAGE_EXTENSION}`,
        filters: [PACKAGE_FILTER],
      });
      return path ? transfer.exportExhibition(path, id) : null;
    },
  );

  ipcMain.handle(IpcChannel.exportCsv, async (event, ids: unknown) => {
    const selection = idsSchema.parse(ids);
    const path = await showSaveDialog(event.sender, {
      title: "Exportar metadatos a CSV",
      defaultPath: `ArtGallery-inventario-${today()}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    return path ? transfer.exportCsv(path, selection) : null;
  });

  ipcMain.handle(IpcChannel.previewImport, async (event) => {
    const [path] = await showOpenDialog(event.sender, {
      title: "Importar obras",
      properties: ["openFile"],
      filters: [PACKAGE_FILTER],
    });
    return path ? transfer.previewImport(path) : null;
  });

  ipcMain.handle(
    IpcChannel.applyImport,
    (_event, sessionId: unknown, policy: unknown) =>
      transfer.applyImport(
        z.string().parse(sessionId),
        z.enum(DUPLICATE_POLICIES).parse(policy),
      ),
  );

  ipcMain.handle(IpcChannel.cancelImport, (_event, sessionId: unknown) =>
    transfer.cancelImport(z.string().parse(sessionId)),
  );
}
