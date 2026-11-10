import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import {
  documentFieldsSchema,
  documentQuerySchema,
  type DocumentDetail,
  type DocumentFieldsInput,
  type DocumentLinkRef,
  type DocumentQuery,
  type DocumentSummary,
  type UploadResult,
} from "../../shared/document";
import type { DocumentRepository } from "./documentRepository";
import { DocumentFileError, type DocumentStore } from "./documentStore";

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
