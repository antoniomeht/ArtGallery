import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { UploadFailureReason } from "../../shared/document";
import {
  documentExtension,
  MAX_DOCUMENT_BYTES,
  type DocumentExtension,
} from "../../shared/documentFormats";

const STORED_FILE_NAME = /^[0-9a-f-]{36}\.[a-z]{3,4}$/;

export class DocumentFileError extends Error {
  constructor(readonly reason: UploadFailureReason) {
    super(`Document file refused: ${reason}`);
  }
}

export interface StoredDocumentFile {
  /** Name inside the store, e.g. `<uuid>.pdf`. */
  fileName: string;
  extension: DocumentExtension;
  bytes: number;
}

/** Keeps a private copy of every uploaded document, like the image store. */
export class DocumentStore {
  constructor(private readonly rootDir: string) {}

  async importFile(
    sourcePath: string,
    maxBytes = MAX_DOCUMENT_BYTES,
  ): Promise<StoredDocumentFile> {
    // A folder or a missing file is unreadable, whatever its name says.
    const info = await stat(sourcePath).catch(() => null);
    if (!info?.isFile()) throw new DocumentFileError("unreadable");
    const extension = documentExtension(sourcePath);
    if (!extension) throw new DocumentFileError("unsupported");
    if (info.size > maxBytes) throw new DocumentFileError("too-large");

    const fileName = `${randomUUID()}.${extension}`;
    const path = this.path(fileName);
    await mkdir(this.rootDir, { recursive: true });
    // A temporary name first, so a crash never leaves a half-written file.
    try {
      await copyFile(sourcePath, `${path}.tmp`);
      await rename(`${path}.tmp`, path);
    } catch {
      await this.delete(fileName);
      throw new DocumentFileError("unreadable");
    }
    return { fileName, extension, bytes: info.size };
  }

  /** Copies a file into the store under the name it already has. */
  async copyIn(sourcePath: string, fileName: string): Promise<void> {
    const path = this.path(fileName);
    await mkdir(this.rootDir, { recursive: true });
    await copyFile(sourcePath, `${path}.tmp`);
    await rename(`${path}.tmp`, path);
  }

  /** Names of every file in the store. */
  async listFiles(): Promise<string[]> {
    const names = await readdir(this.rootDir).catch(() => []);
    return names.filter((name) => STORED_FILE_NAME.test(name));
  }

  async delete(fileName: string): Promise<void> {
    const path = this.path(fileName);
    await Promise.all([
      rm(path, { force: true }),
      rm(`${path}.tmp`, { force: true }),
    ]);
  }

  path(fileName: string): string {
    if (!STORED_FILE_NAME.test(fileName)) {
      throw new Error(`Not a stored document: ${fileName}`);
    }
    return join(this.rootDir, fileName);
  }

  /** Maps a media URL file name to a stored document, or null. */
  resolveMediaPath(fileName: string): string | null {
    return STORED_FILE_NAME.test(fileName)
      ? join(this.rootDir, fileName)
      : null;
  }
}
