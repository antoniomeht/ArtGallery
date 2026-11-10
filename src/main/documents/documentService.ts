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
import { DEFAULT_PAGE_SETUP, pageSetupSchema } from "../../shared/pageSetup";
import { toDocx, type ResolveImage } from "./docxExport";
import { docxToHtml } from "./docxImport";
import type { DocumentRepository } from "./documentRepository";
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
        const file = await this.store.importFile(path, maxBytes);
        const id = randomUUID();
        this.documents.insert({
          id,
          title: basename(name, extname(name)) || name,
          kind: "file",
          fileName: file.fileName,
          originalName: name,
          extension: file.extension,
          bytes: file.bytes,
          content: null,
          timestamp: this.timestamp(),
        });
        result.added.push(this.get(id));
      } catch (error) {
        if (!(error instanceof DocumentFileError)) throw error;
        result.failed.push({ name, reason: error.reason });
      }
    }
    return result;
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
