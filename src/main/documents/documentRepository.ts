import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  DocumentDetail,
  DocumentFieldsInput,
  DocumentKind,
  DocumentQuery,
  DocumentSummary,
} from "../../shared/document";
import { transaction } from "../database/transaction";

interface DocumentRow {
  id: string;
  title: string;
  kind: DocumentKind;
  notes: string | null;
  file_name: string | null;
  original_name: string | null;
  extension: string | null;
  bytes: number | null;
  created_at: string;
  updated_at: string;
}

export interface NewDocumentRecord {
  id: string;
  title: string;
  kind: DocumentKind;
  fileName: string | null;
  originalName: string | null;
  extension: string | null;
  bytes: number | null;
  timestamp: string;
}

export interface DocumentFile {
  fileName: string;
  originalName: string;
  extension: string;
  bytes: number;
}

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

export class DocumentRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(query: DocumentQuery): DocumentSummary[] {
    const conditions = ["deleted_at IS NULL"];
    const params: SQLInputValue[] = [];
    for (const word of query.text?.split(/\s+/).filter(Boolean) ?? []) {
      conditions.push(
        "(sort_key(title) LIKE sort_key(?) ESCAPE '\\' OR sort_key(notes) LIKE sort_key(?) ESCAPE '\\')",
      );
      const pattern = `%${escapeLike(word)}%`;
      params.push(pattern, pattern);
    }
    if (query.kind) {
      conditions.push("kind = ?");
      params.push(query.kind);
    }
    const order =
      query.sort === "title" ? "sort_key(title)" : "updated_at DESC, id";
    const rows = this.db
      .prepare(
        `SELECT * FROM documents WHERE ${conditions.join(" AND ")}
         ORDER BY ${order}`,
      )
      .all(...params) as unknown as DocumentRow[];
    return rows.map(toSummary);
  }

  find(id: string): DocumentDetail | null {
    const row = this.db
      .prepare("SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL")
      .get(id) as DocumentRow | undefined;
    return row ? toDetail(row) : null;
  }

  insert(record: NewDocumentRecord): void {
    this.db
      .prepare(
        `INSERT INTO documents (id, title, kind, file_name, original_name,
           extension, bytes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.title,
        record.kind,
        record.fileName,
        record.originalName,
        record.extension,
        record.bytes,
        record.timestamp,
        record.timestamp,
      );
  }

  update(
    id: string,
    fields: Required<DocumentFieldsInput>,
    timestamp: string,
  ): boolean {
    const { changes } = this.db
      .prepare(
        `UPDATE documents SET title = ?, notes = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .run(fields.title, fields.notes, timestamp, id);
    return changes > 0;
  }

  /** Points the document at a new file; returns the name of the old one. */
  replaceFile(
    id: string,
    file: DocumentFile,
    timestamp: string,
  ): string | null {
    return transaction(this.db, () => {
      const row = this.db
        .prepare(
          "SELECT file_name FROM documents WHERE id = ? AND deleted_at IS NULL",
        )
        .get(id) as { file_name: string | null } | undefined;
      if (!row) return null;
      this.db
        .prepare(
          `UPDATE documents SET file_name = ?, original_name = ?, extension = ?,
             bytes = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          file.fileName,
          file.originalName,
          file.extension,
          file.bytes,
          timestamp,
          id,
        );
      return row.file_name;
    });
  }

  setDeletedAt(id: string, deletedAt: string | null): void {
    this.db
      .prepare("UPDATE documents SET deleted_at = ? WHERE id = ?")
      .run(deletedAt, id);
  }

  /** Removes deleted documents; returns their file names. */
  purgeDeleted(): string[] {
    return transaction(this.db, () => {
      const rows = this.db
        .prepare("SELECT file_name FROM documents WHERE deleted_at IS NOT NULL")
        .all() as { file_name: string | null }[];
      this.db
        .prepare("DELETE FROM documents WHERE deleted_at IS NOT NULL")
        .run();
      return rows.flatMap((row) => (row.file_name ? [row.file_name] : []));
    });
  }
}

function toSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    extension: row.extension,
    bytes: row.bytes,
    links: [],
    updatedAt: row.updated_at,
  };
}

function toDetail(row: DocumentRow): DocumentDetail {
  return {
    ...toSummary(row),
    notes: row.notes,
    originalName: row.original_name,
    fileName: row.file_name,
    createdAt: row.created_at,
  };
}
