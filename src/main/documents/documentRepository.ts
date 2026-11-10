import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  DocumentComment,
  DocumentDetail,
  DocumentLink,
  DocumentLinkRef,
  DocumentLinkType,
  DocumentFieldsInput,
  DocumentKind,
  DocumentQuery,
  DocumentSummary,
} from "../../shared/document";
import type { TextContent } from "../../shared/editorSchema";
import { pageSetupSchema, type PageSetup } from "../../shared/pageSetup";
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
  content: string | null;
  page_setup: string | null;
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
  content: string | null;
  timestamp: string;
}

/** A document with everything it has, for backups. */
export interface DocumentRecord {
  id: string;
  title: string;
  notes: string | null;
  kind: DocumentKind;
  createdAt: string;
  updatedAt: string;
  fileName: string | null;
  originalName: string | null;
  extension: string | null;
  bytes: number | null;
  content: TextContent | null;
  pageSetup: PageSetup | null;
  assets: string[];
  comments: DocumentComment[];
  links: { artworks: string[]; exhibitions: string[]; collections: string[] };
}

export interface DocumentFile {
  fileName: string;
  originalName: string;
  extension: string;
  bytes: number;
}

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/** Where the links of each kind live, and what names their target. */
const LINKS: Record<
  DocumentLinkType,
  { table: string; column: string; target: string; label: string }
> = {
  artwork: {
    table: "document_artworks",
    column: "artwork_id",
    target: "artworks",
    label: "title",
  },
  exhibition: {
    table: "document_exhibitions",
    column: "exhibition_id",
    target: "exhibitions",
    label: "name",
  },
  collection: {
    table: "document_collections",
    column: "collection_id",
    target: "collections",
    label: "name",
  },
};

const LINKS_SQL = Object.entries(LINKS)
  .map(
    ([type, { table, column, target, label }], order) =>
      `SELECT '${type}' AS type, t.id AS id, t.${label} AS label, ${order} AS kind_order
       FROM ${table} l JOIN ${target} t ON t.id = l.${column}
       WHERE l.document_id = ?`,
  )
  .join(" UNION ALL ");

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
    if (query.linkedTo) {
      const { table, column } = LINKS[query.linkedTo.type];
      conditions.push(
        `id IN (SELECT document_id FROM ${table} WHERE ${column} = ?)`,
      );
      params.push(query.linkedTo.id);
    }
    const order =
      query.sort === "title" ? "sort_key(title)" : "updated_at DESC, id";
    const rows = this.db
      .prepare(
        `SELECT * FROM documents WHERE ${conditions.join(" AND ")}
         ORDER BY ${order}`,
      )
      .all(...params) as unknown as DocumentRow[];
    return rows.map((row) => this.toSummary(row));
  }

  find(id: string): DocumentDetail | null {
    const row = this.db
      .prepare("SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL")
      .get(id) as DocumentRow | undefined;
    return row ? { ...toDetail(row), links: this.linksOf(row.id) } : null;
  }

  targetExists({ type, id }: DocumentLinkRef): boolean {
    const { target } = LINKS[type];
    return (
      this.db.prepare(`SELECT 1 FROM ${target} WHERE id = ?`).get(id) !==
      undefined
    );
  }

  /** Links documents outside the deletion queue; existing links stay. */
  link(documentIds: readonly string[], ref: DocumentLinkRef): void {
    const { table, column } = LINKS[ref.type];
    const add = this.db.prepare(
      `INSERT OR IGNORE INTO ${table} (document_id, ${column})
       SELECT id, ? FROM documents WHERE id = ? AND deleted_at IS NULL`,
    );
    transaction(this.db, () => {
      for (const documentId of documentIds) add.run(ref.id, documentId);
    });
  }

  unlink(documentId: string, ref: DocumentLinkRef): void {
    const { table, column } = LINKS[ref.type];
    this.db
      .prepare(`DELETE FROM ${table} WHERE document_id = ? AND ${column} = ?`)
      .run(documentId, ref.id);
  }

  private linksOf(documentId: string): DocumentLink[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM (${LINKS_SQL}) ORDER BY kind_order, sort_key(label)`,
      )
      .all(
        ...Object.keys(LINKS).map(() => documentId),
      ) as unknown as (DocumentLink & { kind_order: number })[];
    return rows.map(({ type, id, label }) => ({ type, id, label }));
  }

  private toSummary(row: DocumentRow): DocumentSummary {
    return { ...toSummary(row), links: this.linksOf(row.id) };
  }

  insert(record: NewDocumentRecord): void {
    this.db
      .prepare(
        `INSERT INTO documents (id, title, kind, file_name, original_name,
           extension, bytes, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.title,
        record.kind,
        record.fileName,
        record.originalName,
        record.extension,
        record.bytes,
        record.content,
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

  saveContent(id: string, content: string, timestamp: string): boolean {
    const { changes } = this.db
      .prepare(
        `UPDATE documents SET content = ?, updated_at = ?
         WHERE id = ? AND kind = 'text' AND deleted_at IS NULL`,
      )
      .run(content, timestamp, id);
    return changes > 0;
  }

  savePageSetup(id: string, pageSetup: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE documents SET page_setup = ?, updated_at = ?
         WHERE id = ? AND kind = 'text' AND deleted_at IS NULL`,
      )
      .run(pageSetup, timestamp, id);
  }

  setDeletedAt(id: string, deletedAt: string | null): void {
    this.db
      .prepare("UPDATE documents SET deleted_at = ? WHERE id = ?")
      .run(deletedAt, id);
  }

  /** Every document outside the deletion queue, with all it has. */
  listRecords(): DocumentRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM documents WHERE deleted_at IS NULL ORDER BY id")
      .all() as unknown as DocumentRow[];
    const ids = (sql: string, id: string) =>
      (this.db.prepare(sql).all(id) as { id: string }[]).map((row) => row.id);
    return rows.map((row) => {
      const detail = toDetail(row);
      return {
        id: row.id,
        title: row.title,
        notes: row.notes,
        kind: row.kind,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        fileName: row.file_name,
        originalName: row.original_name,
        extension: row.extension,
        bytes: row.bytes,
        content: detail.content,
        pageSetup: detail.pageSetup,
        assets: ids(
          "SELECT file_name AS id FROM document_assets WHERE document_id = ?",
          row.id,
        ),
        comments: this.listComments(row.id),
        links: Object.fromEntries(
          (["artwork", "exhibition", "collection"] as const).map((type) => [
            `${type}s`,
            ids(
              `SELECT ${LINKS[type].column} AS id FROM ${LINKS[type].table}
               WHERE document_id = ?`,
              row.id,
            ),
          ]),
        ) as DocumentRecord["links"],
      };
    });
  }

  /**
   * Replaces every document, its images, comments and links. Links to
   * anything missing are skipped. Joins a transaction already open.
   */
  replaceAll(records: readonly DocumentRecord[]): void {
    transaction(this.db, () => {
      this.db.exec("DELETE FROM documents");
      for (const record of records) {
        this.db
          .prepare(
            `INSERT INTO documents (id, title, kind, notes, file_name,
               original_name, extension, bytes, content, page_setup,
               created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            record.id,
            record.title,
            record.kind,
            record.notes,
            record.fileName,
            record.originalName,
            record.extension,
            record.bytes,
            record.content ? JSON.stringify(record.content) : null,
            record.pageSetup ? JSON.stringify(record.pageSetup) : null,
            record.createdAt,
            record.updatedAt,
          );
        for (const fileName of record.assets)
          this.addAsset(record.id, fileName);
        for (const comment of record.comments)
          this.addComment(record.id, comment);
        const linked = [
          ["artwork", record.links.artworks],
          ["exhibition", record.links.exhibitions],
          ["collection", record.links.collections],
        ] as const;
        for (const [type, targetIds] of linked) {
          const { table, column, target } = LINKS[type];
          const add = this.db.prepare(
            `INSERT OR IGNORE INTO ${table} (document_id, ${column})
             SELECT ?, id FROM ${target} WHERE id = ?`,
          );
          for (const targetId of targetIds) add.run(record.id, targetId);
        }
      }
    });
  }

  /** Every file the documents use, including those waiting to be purged. */
  listFileNames(): string[] {
    return (
      this.db
        .prepare(
          `SELECT file_name AS name FROM documents WHERE file_name IS NOT NULL
           UNION SELECT file_name FROM document_assets`,
        )
        .all() as { name: string }[]
    ).map(({ name }) => name);
  }

  addComment(documentId: string, comment: DocumentComment): void {
    this.db
      .prepare(
        `INSERT INTO document_comments (id, document_id, body, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(comment.id, documentId, comment.body, comment.createdAt);
  }

  listComments(documentId: string): DocumentComment[] {
    return this.db
      .prepare(
        `SELECT id, body, created_at AS createdAt FROM document_comments
         WHERE document_id = ? ORDER BY created_at, id`,
      )
      .all(documentId) as unknown as DocumentComment[];
  }

  deleteComment(id: string): void {
    this.db.prepare("DELETE FROM document_comments WHERE id = ?").run(id);
  }

  addAsset(documentId: string, fileName: string): void {
    this.db
      .prepare(
        "INSERT INTO document_assets (file_name, document_id) VALUES (?, ?)",
      )
      .run(fileName, documentId);
  }

  /** Removes deleted documents; returns their files and images. */
  purgeDeleted(): string[] {
    return transaction(this.db, () => {
      const rows = this.db
        .prepare(
          `SELECT file_name FROM documents WHERE deleted_at IS NOT NULL
           UNION ALL
           SELECT a.file_name FROM document_assets a
           JOIN documents d ON d.id = a.document_id
           WHERE d.deleted_at IS NOT NULL`,
        )
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
    content: row.content ? (JSON.parse(row.content) as TextContent) : null,
    pageSetup:
      row.kind === "text"
        ? pageSetupSchema.parse(
            row.page_setup ? JSON.parse(row.page_setup) : {},
          )
        : null,
    createdAt: row.created_at,
  };
}
