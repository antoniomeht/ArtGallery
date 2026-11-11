import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import { labelOptionsSchema } from "../../shared/labels";
import { DEFAULT_PAGE_SETUP } from "../../shared/pageSetup";
import { printSourceSchema } from "../../shared/print";
import type { DocumentService } from "../documents/documentService";
import type { ExhibitionService } from "../exhibitions/exhibitionService";
import { documentPdfOptions } from "../print/documentPdfOptions";
import {
  handlePrintReady,
  printToPdf,
  printWithDialog,
} from "../print/printToPdf";
import { showSaveDialog } from "./dialogs";

const catalogOptions = z.object({ includePrices: z.boolean() });

/** File names must not contain characters that Windows or macOS reject. */
const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "ArtGallery";

export function registerPrintHandlers(
  exhibitions: ExhibitionService,
  documents: DocumentService,
  /** Scratch space for files on their way into the documents. */
  workDir: string,
): void {
  handlePrintReady();

  const textDocument = (documentId: unknown) => {
    const document = documents.get(z.string().min(1).parse(documentId));
    if (document.kind !== "text") throw new Error("Not a text document");
    return {
      document,
      job: { kind: "document" as const, documentId: document.id },
      setup: document.pageSetup ?? DEFAULT_PAGE_SETUP,
    };
  };

  ipcMain.handle(
    IpcChannel.exportDocumentPdf,
    async (event, documentId: unknown) => {
      const { document, job, setup } = textDocument(documentId);
      const path = await showSaveDialog(event.sender, {
        title: "Descargar PDF",
        defaultPath: `${safeFileName(document.title)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return null;
      await printToPdf(job, path, documentPdfOptions(setup));
      return { path };
    },
  );

  // The system dialog prints Electron's plain header and footer, so the
  // header is the document's own and the footer keeps Chromium's numbers.
  ipcMain.handle(
    IpcChannel.printTextDocument,
    (_event, documentId: unknown) => {
      const { job, setup } = textDocument(documentId);
      return printWithDialog(job, { header: setup.header || " ", footer: " " });
    },
  );

  ipcMain.handle(
    IpcChannel.saveCatalogPdf,
    async (_event, exhibitionId: unknown, options: unknown) => {
      const id = z.string().min(1).parse(exhibitionId);
      const { includePrices } = catalogOptions.parse(options);
      await mkdir(workDir, { recursive: true });
      const path = join(workDir, `catalog-${randomUUID()}.pdf`);
      try {
        await printToPdf(
          { kind: "catalog", exhibitionId: id, includePrices },
          path,
        );
        return await documents.addGeneratedFile(path, {
          title: `Catálogo - ${safeFileName(exhibitions.get(id).name)}`,
          linkTo: { type: "exhibition", id },
        });
      } finally {
        await rm(path, { force: true });
      }
    },
  );

  ipcMain.handle(
    IpcChannel.exportLabelsPdf,
    async (event, source: unknown, options: unknown) => {
      const job = {
        kind: "labels" as const,
        source: printSourceSchema.parse(source),
        options: labelOptionsSchema.parse(options),
      };
      const name =
        "exhibitionId" in job.source
          ? exhibitions.get(job.source.exhibitionId).name
          : "seleccion";
      const path = await showSaveDialog(event.sender, {
        title: "Guardar cartelas en PDF",
        defaultPath: `Cartelas - ${safeFileName(name)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return null;
      await printToPdf(job, path);
      return { path };
    },
  );
}
