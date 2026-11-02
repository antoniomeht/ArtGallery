import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import type { ExhibitionService } from "../exhibitions/exhibitionService";
import { handlePrintReady, printToPdf } from "../print/printToPdf";
import { showSaveDialog } from "./dialogs";

const catalogOptions = z.object({ includePrices: z.boolean() });

/** File names must not contain characters that Windows or macOS reject. */
const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "ArtGallery";

export function registerPrintHandlers(exhibitions: ExhibitionService): void {
  handlePrintReady();

  ipcMain.handle(
    IpcChannel.exportCatalogPdf,
    async (event, exhibitionId: unknown, options: unknown) => {
      const id = z.string().min(1).parse(exhibitionId);
      const { includePrices } = catalogOptions.parse(options);
      const path = await showSaveDialog(event.sender, {
        title: "Guardar catálogo en PDF",
        defaultPath: `${safeFileName(exhibitions.get(id).name)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return null;
      await printToPdf(
        { kind: "catalog", exhibitionId: id, includePrices },
        path,
      );
      return { path };
    },
  );
}
