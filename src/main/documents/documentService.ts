import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import {
  commentBodySchema,
  documentFieldsSchema,
  type DocumentComment,
  documentQuerySchema,
  type DocumentDetail,
  type DocumentFieldsInput,
  type DocumentLinkRef,
  type DocumentQuery,
  type DocumentSummary,
  type UploadResult,
} from "../../shared/document";
import {
  commentIdsIn,
  DOCUMENT_ASSET_SRC,
  EMPTY_TEXT_CONTENT,
  textContentSchema,
} from "../../shared/editorSchema";
import {
  documentExtension,
  isViewableImage,
} from "../../shared/documentFormats";
import { documentFileUrl } from "../../shared/media";
import type { SpreadsheetPreview } from "../../shared/spreadsheet";
import { DEFAULT_PAGE_SETUP, pageSetupSchema } from "../../shared/pageSetup";
import { toDocx, type ResolveImage } from "./docxExport";
import { docxToHtml } from "./docxImport";
import { readXlsx } from "./xlsxPreview";
import type { PackageDocument } from "../package/packageFormat";
import type { ExportDocument } from "../package/writePackage";
import type { DocumentRecord, DocumentRepository } from "./documentRepository";
import { DocumentFileError, type DocumentStore } from "./documentStore";

/** Images of a Word file that a document can show. */
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly store: DocumentStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(query: DocumentQuery): DocumentSummary[] {
    return this.documents.list(documentQuerySchema.parse(query));
  }

  get(id: string): DocumentDetail {
    const document = this.documents.find(id);
    if (!document) throw new Error(`Document not found: ${id}`);
    return document;
  }

  /** Each file is added or reported on its own; one failure stops nothing. */
  async uploadFiles(
    paths: readonly string[],
    { maxBytes }: { maxBytes?: number } = {},
  ): Promise<UploadResult> {
    const result: UploadResult = { added: [], failed: [] };
    for (const path of paths) {
      const name = basename(path);
      try {
        const title = basename(name, extname(name)) || name;
        result.added.push(await this.insertFile(path, title, name, maxBytes));
      } catch (error) {
        if (!(error instanceof DocumentFileError)) throw error;
        result.failed.push({ name, reason: error.reason });
      }
    }
    return result;
  }

  /**
   * Keeps a file the app made, such as a catalogue, linked to what it was
   * made for. The file at `path` is copied; the caller removes it.
   */
  async addGeneratedFile(
    path: string,
    { title, linkTo }: { title: string; linkTo: DocumentLinkRef },
  ): Promise<DocumentDetail> {
    const document = await this.insertFile(
      path,
      title,
      `${title}${extname(path)}`,
    );
    this.link([document.id], linkTo);
    return this.get(document.id);
  }

  private async insertFile(
    path: string,
    title: string,
    originalName: string,
    maxBytes?: number,
  ): Promise<DocumentDetail> {
    const file = await this.store.importFile(path, maxBytes);
    const id = randomUUID();
    this.documents.insert({
      id,
      title,
      kind: "file",
      fileName: file.fileName,
      originalName,
      extension: file.extension,
      bytes: file.bytes,
      content: null,
      timestamp: this.timestamp(),
    });
    return this.get(id);
  }

  /** A new, empty text document. */
  createText(title: string): DocumentDetail {
    const id = randomUUID();
    this.documents.insert({
      id,
      title: documentFieldsSchema.shape.title.parse(title),
      kind: "text",
      fileName: null,
      originalName: null,
      extension: null,
      bytes: null,
      content: JSON.stringify(EMPTY_TEXT_CONTENT),
      timestamp: this.timestamp(),
    });
    return this.get(id);
  }

  /** Content is checked before it is written; anything unknown is refused. */
  saveContent(id: string, content: unknown): DocumentDetail {
    if (this.get(id).kind !== "text") {
      throw new Error(`Document ${id} is not a text document`);
    }
    const parsed = textContentSchema.parse(content);
    this.documents.saveContent(id, JSON.stringify(parsed), this.timestamp());
    return this.get(id);
  }

  savePageSetup(id: string, input: unknown): DocumentDetail {
    if (this.get(id).kind !== "text") {
      throw new Error(`Document ${id} is not a text document`);
    }
    const setup = pageSetupSchema.parse(input);
    this.documents.savePageSetup(id, JSON.stringify(setup), this.timestamp());
    return this.get(id);
  }

  addComment(documentId: string, body: string): DocumentComment {
    if (this.get(documentId).kind !== "text") {
      throw new Error(`Document ${documentId} is not a text document`);
    }
    const comment = {
      id: randomUUID(),
      body: commentBodySchema.parse(body),
      createdAt: this.timestamp(),
    };
    this.documents.addComment(documentId, comment);
    return comment;
  }

  /** Only comments whose text is still there; the rest are hidden. */
  listComments(documentId: string): DocumentComment[] {
    const { content } = this.get(documentId);
    const marked = content ? commentIdsIn(content) : new Set<string>();
    return this.documents
      .listComments(documentId)
      .filter(({ id }) => marked.has(id));
  }

  deleteComment(id: string): void {
    this.documents.deleteComment(id);
  }

  /** Copies an image for a text document; returns how the editor refers to it. */
  async addImageAsset(documentId: string, path: string): Promise<string> {
    if (this.get(documentId).kind !== "text") {
      throw new Error(`Document ${documentId} is not a text document`);
    }
    if (!isViewableImage(documentExtension(path))) {
      throw new DocumentFileError("unsupported");
    }
    const file = await this.store.importFile(path);
    this.documents.addAsset(documentId, file.fileName);
    return `document-asset:${file.fileName}`;
  }

  async replaceFile(id: string, path: string): Promise<DocumentDetail> {
    this.get(id);
    const file = await this.store.importFile(path);
    const old = this.documents.replaceFile(
      id,
      { ...file, originalName: basename(path) },
      this.timestamp(),
    );
    if (old) await this.store.delete(old);
    return this.get(id);
  }

  update(id: string, input: DocumentFieldsInput): DocumentDetail {
    const fields = documentFieldsSchema.parse(input);
    if (!this.documents.update(id, fields, this.timestamp())) {
      throw new Error(`Document not found: ${id}`);
    }
    return this.get(id);
  }

  /** Hidden at once; removed for good by `purgeDeleted`, so it can be undone. */
  delete(id: string): void {
    this.get(id);
    this.documents.setDeletedAt(id, this.timestamp());
  }

  restore(id: string): void {
    this.documents.setDeletedAt(id, null);
  }

  async purgeDeleted(): Promise<void> {
    const files = this.documents.purgeDeleted();
    // Files go only after the database change is committed.
    await Promise.all(files.map((file) => this.store.delete(file)));
  }

  link(documentIds: readonly string[], target: DocumentLinkRef): void {
    if (!this.documents.targetExists(target)) {
      throw new Error(`Link target not found: ${target.type} ${target.id}`);
    }
    this.documents.link(documentIds, target);
  }

  unlink(documentId: string, target: DocumentLinkRef): void {
    this.documents.unlink(documentId, target);
  }

  listLinked(target: DocumentLinkRef): DocumentSummary[] {
    return this.list({ linkedTo: target });
  }

  /**
   * A new text document made from a Word file. Its images are copied for
   * the document; the HTML returned is what the editor loads.
   */
  async importDocx(
    path: string,
    title = basename(path, extname(path)),
  ): Promise<{ document: DocumentDetail; html: string }> {
    const document = this.createText(
      title.slice(0, 300) || "Documento de Word",
    );
    const workDir = await mkdtemp(join(tmpdir(), "artgallery-docx-"));
    try {
      const html = await docxToHtml(path, async (buffer, contentType) => {
        const extension = IMAGE_TYPES[contentType];
        if (!extension) return null;
        const file = join(workDir, `${randomUUID()}.${extension}`);
        await writeFile(file, buffer);
        const src = await this.addImageAsset(document.id, file);
        return documentFileUrl(src.slice("document-asset:".length));
      });
      return { document, html };
    } catch (error) {
      this.delete(document.id);
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  /**
   * An uploaded Word file as HTML to look at. Its images travel inside the
   * HTML, so nothing is stored.
   */
  async previewDocx(id: string): Promise<string> {
    const document = this.get(id);
    if (document.extension !== "docx") {
      throw new Error(`Document ${id} is not a Word document`);
    }
    return docxToHtml(this.filePath(id), async (buffer, contentType) =>
      IMAGE_TYPES[contentType]
        ? `data:${contentType};base64,${buffer.toString("base64")}`
        : null,
    );
  }

  /** The first rows of each sheet of an uploaded Excel file, as text. */
  async previewXlsx(id: string): Promise<SpreadsheetPreview> {
    if (this.get(id).extension !== "xlsx") {
      throw new Error(`Document ${id} is not an Excel workbook`);
    }
    return readXlsx(this.filePath(id));
  }

  /** A Word file with the text document, its images and its page setup. */
  async exportDocx(
    id: string,
    resolveArtworkImage: ResolveImage,
  ): Promise<Buffer> {
    const document = this.get(id);
    if (document.kind !== "text" || !document.content) {
      throw new Error(`Document ${id} is not a text document`);
    }
    return toDocx(
      document.content,
      document.pageSetup ?? DEFAULT_PAGE_SETUP,
      async (src) => {
        const asset = DOCUMENT_ASSET_SRC.exec(src)?.[1];
        if (asset) return this.store.path(asset);
        return resolveArtworkImage(src);
      },
    );
  }

  /** Every document with where its files are, for backups. */
  listForExport(): ExportDocument[] {
    return this.documents.listRecords().map((record) => ({
      id: record.id,
      title: record.title,
      notes: record.notes,
      kind: record.kind,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      content: record.content,
      pageSetup: record.pageSetup,
      comments: record.comments,
      links: record.links,
      file:
        record.fileName && record.originalName && record.extension
          ? {
              fileName: record.fileName,
              path: this.store.path(record.fileName),
              originalName: record.originalName,
              extension: record.extension,
            }
          : null,
      assets: record.assets.map((fileName) => ({
        fileName,
        path: this.store.path(fileName),
      })),
    }));
  }

  /**
   * Copies the files of a validated package into the store, under the names
   * they had, and returns the documents ready for `replaceAll`.
   */
  async copyFromPackage(
    documents: readonly PackageDocument[],
    pathOf: (file: string) => string,
  ): Promise<DocumentRecord[]> {
    const records: DocumentRecord[] = [];
    for (const document of documents) {
      const files = [
        ...(document.file ? [document.file.file] : []),
        ...document.assets.map(({ file }) => file),
      ];
      for (const file of files) {
        await this.store.copyIn(pathOf(file), basename(file));
      }
      records.push({
        id: document.id,
        title: document.title,
        notes: document.notes,
        kind: document.kind,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        fileName: document.file ? basename(document.file.file) : null,
        originalName: document.file?.originalName ?? null,
        extension: document.file?.extension ?? null,
        bytes: document.file?.bytes ?? null,
        content: document.content,
        pageSetup: document.pageSetup,
        assets: document.assets.map(({ file }) => basename(file)),
        comments: document.comments,
        links: document.links,
      });
    }
    return records;
  }

  /** Replaces every document; joins a transaction already open. */
  replaceAll(records: readonly DocumentRecord[]): void {
    this.documents.replaceAll(records);
  }

  /** Removes stored files no document uses any more. */
  async removeUnusedFiles(): Promise<void> {
    const used = new Set(this.documents.listFileNames());
    const files = await this.store.listFiles();
    await Promise.all(
      files
        .filter((file) => !used.has(file))
        .map((file) => this.store.delete(file)),
    );
  }

  /** Where the file of an uploaded document is stored. */
  filePath(id: string): string {
    const { fileName } = this.get(id);
    if (!fileName) throw new Error(`Document has no file: ${id}`);
    return this.store.path(fileName);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
