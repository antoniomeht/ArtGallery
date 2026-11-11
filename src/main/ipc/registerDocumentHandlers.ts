import { ipcMain, shell } from "electron";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import {
  documentLinkRefSchema,
  documentQuerySchema,
} from "../../shared/document";
import {
  DOCUMENT_EXTENSIONS,
  externalFileName,
} from "../../shared/documentFormats";
import { ARTWORK_IMAGE_SRC } from "../../shared/editorSchema";
import type { ImageStore } from "../images/imageStore";
import type { DocumentService } from "../documents/documentService";
import { readPdfLoadState } from "../media/pdfLoadState";
import { MEDIA_SCHEME } from "../../shared/media";
import { showOpenDialog, showSaveDialog } from "./dialogs";

const id = z.string().min(1);
const paths = z.array(z.string().min(1)).max(500);
const DOCUMENT_FILTER = {
  name: "Documentos",
  extensions: [...DOCUMENT_EXTENSIONS],
};

/** Payloads are validated here or by the service before anything is written. */
export function registerDocumentHandlers(
  documents: DocumentService,
  images: ImageStore,
): void {
  // Artwork images in a document point at their thumbnail.
  const resolveArtworkImage = async (src: string) => {
    const imageId = ARTWORK_IMAGE_SRC.exec(src)?.[1];
    if (!imageId) return null;
    const path = images.thumbnailPath(imageId);
    return (await stat(path).catch(() => null)) ? path : null;
  };
  const toImport = ({
    document,
    html,
  }: Awaited<ReturnType<DocumentService["importDocx"]>>) => ({
    documentId: document.id,
    html,
  });

  ipcMain.handle(IpcChannel.importDocxAsText, async (event) => {
    const [path] = await showOpenDialog(event.sender, {
      title: "Abrir un documento de Word",
      properties: ["openFile"],
      filters: [{ name: "Documento de Word", extensions: ["docx"] }],
    });
    return path ? toImport(await documents.importDocx(path)) : null;
  });
  ipcMain.handle(
    IpcChannel.convertDocumentToText,
    async (_event, documentId: unknown) => {
      const source = documents.get(id.parse(documentId));
      if (source.extension !== "docx") throw new Error("Not a Word document");
      return toImport(
        await documents.importDocx(documents.filePath(source.id), source.title),
      );
    },
  );
  ipcMain.handle(IpcChannel.previewDocx, (_event, documentId: unknown) =>
    documents.previewDocx(id.parse(documentId)),
  );
  ipcMain.handle(IpcChannel.pdfLoadState, (event, src: unknown) =>
    readPdfLoadState(
      event.sender.mainFrame.framesInSubtree,
      z.string().startsWith(`${MEDIA_SCHEME}://documents/`).parse(src),
    ),
  );
  ipcMain.handle(IpcChannel.previewXlsx, (_event, documentId: unknown) =>
    documents.previewXlsx(id.parse(documentId)),
  );
  ipcMain.handle(
    IpcChannel.exportDocumentDocx,
    async (event, documentId: unknown) => {
      const document = documents.get(id.parse(documentId));
      const path = await showSaveDialog(event.sender, {
        title: "Exportar a Word",
        defaultPath: `${document.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Documento"}.docx`,
        filters: [{ name: "Documento de Word", extensions: ["docx"] }],
      });
      if (!path) return null;
      await writeFile(
        path,
        await documents.exportDocx(document.id, resolveArtworkImage),
      );
      return { path };
    },
  );

  ipcMain.handle(IpcChannel.listDocuments, (_event, query: unknown) =>
    documents.list(documentQuerySchema.parse(query ?? {})),
  );
  ipcMain.handle(IpcChannel.getDocument, (_event, documentId: unknown) =>
    documents.get(id.parse(documentId)),
  );
  ipcMain.handle(IpcChannel.uploadDocuments, (_event, files: unknown) =>
    documents.uploadFiles(paths.parse(files)),
  );
  ipcMain.handle(IpcChannel.pickDocumentFiles, (event) =>
    showOpenDialog(event.sender, {
      title: "Subir documentos",
      properties: ["openFile", "multiSelections"],
      filters: [DOCUMENT_FILTER],
    }),
  );
  ipcMain.handle(
    IpcChannel.replaceDocumentFile,
    async (event, documentId: unknown) => {
      const target = id.parse(documentId);
      const [path] = await showOpenDialog(event.sender, {
        title: "Reemplazar archivo",
        properties: ["openFile"],
        filters: [DOCUMENT_FILTER],
      });
      return path ? documents.replaceFile(target, path) : null;
    },
  );
  ipcMain.handle(
    IpcChannel.updateDocument,
    (_event, documentId: unknown, fields) =>
      documents.update(id.parse(documentId), fields),
  );
  ipcMain.handle(IpcChannel.deleteDocument, (_event, documentId: unknown) =>
    documents.delete(id.parse(documentId)),
  );
  ipcMain.handle(IpcChannel.restoreDocument, (_event, documentId: unknown) =>
    documents.restore(id.parse(documentId)),
  );
  ipcMain.handle(IpcChannel.createTextDocument, (_event, title: unknown) =>
    documents.createText(z.string().parse(title)),
  );
  ipcMain.handle(
    IpcChannel.saveDocumentContent,
    (_event, documentId: unknown, content: unknown) =>
      documents.saveContent(id.parse(documentId), content),
  );
  ipcMain.handle(
    IpcChannel.addDocumentImage,
    async (event, documentId: unknown) => {
      const target = id.parse(documentId);
      const [path] = await showOpenDialog(event.sender, {
        title: "Insertar imagen",
        properties: ["openFile"],
        filters: [
          {
            name: "Imágenes",
            extensions: ["jpg", "jpeg", "png", "webp", "gif"],
          },
        ],
      });
      return path ? { src: await documents.addImageAsset(target, path) } : null;
    },
  );
  ipcMain.handle(
    IpcChannel.savePageSetup,
    (_event, documentId: unknown, setup: unknown) =>
      documents.savePageSetup(id.parse(documentId), setup),
  );
  ipcMain.handle(
    IpcChannel.addDocumentComment,
    (_event, documentId: unknown, body: unknown) =>
      documents.addComment(id.parse(documentId), z.string().parse(body)),
  );
  ipcMain.handle(IpcChannel.listDocumentComments, (_event, documentId) =>
    documents.listComments(id.parse(documentId)),
  );
  ipcMain.handle(IpcChannel.deleteDocumentComment, (_event, commentId) =>
    documents.deleteComment(id.parse(commentId)),
  );
  ipcMain.handle(
    IpcChannel.linkDocuments,
    (_event, documentIds: unknown, target: unknown) =>
      documents.link(
        z.array(id).max(500).parse(documentIds),
        documentLinkRefSchema.parse(target),
      ),
  );
  ipcMain.handle(
    IpcChannel.unlinkDocument,
    (_event, documentId: unknown, target: unknown) =>
      documents.unlink(
        id.parse(documentId),
        documentLinkRefSchema.parse(target),
      ),
  );
  ipcMain.handle(IpcChannel.listLinkedDocuments, (_event, target: unknown) =>
    documents.listLinked(documentLinkRefSchema.parse(target)),
  );
  ipcMain.handle(
    IpcChannel.openDocumentExternally,
    async (_event, documentId: unknown) => {
      const document = documents.get(id.parse(documentId));
      // A copy with its real name: the stored file is never edited by mistake.
      const folder = join(tmpdir(), "ArtGallery", document.id);
      const copy = join(
        folder,
        externalFileName(
          document.originalName ?? document.title,
          document.extension ?? "",
        ),
      );
      await mkdir(folder, { recursive: true });
      await copyFile(documents.filePath(document.id), copy);
      const error = await shell.openPath(copy);
      if (error) throw new Error(error);
    },
  );
  ipcMain.handle(
    IpcChannel.saveDocumentAs,
    async (event, documentId: unknown) => {
      const document = documents.get(id.parse(documentId));
      const path = await showSaveDialog(event.sender, {
        title: "Descargar documento",
        defaultPath: externalFileName(
          document.originalName ?? document.title,
          document.extension ?? "",
        ),
      });
      if (!path) return null;
      await copyFile(documents.filePath(document.id), path);
      return { path };
    },
  );
}
