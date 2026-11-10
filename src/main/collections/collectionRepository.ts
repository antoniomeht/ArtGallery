import type { DatabaseSync } from "node:sqlite";
import type {
  CollectionSummary,
  DeletedCollection,
} from "../../shared/collection";
import { transaction } from "../database/transaction";

const SUMMARY_SQL = `SELECT c.id, c.name,
    (SELECT COUNT(*) FROM collection_artworks ca
     JOIN artworks a ON a.id = ca.artwork_id
     WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) AS artworkCount
  FROM collections c`;

/** A collection with every member, for backups and exports. */
export interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  artworkIds: string[];
}

export class CollectionRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(): CollectionSummary[] {
    return this.db
      .prepare(`${SUMMARY_SQL} ORDER BY sort_key(c.name)`)
      .all() as unknown as CollectionSummary[];
  }

  find(id: string): CollectionSummary | null {
    const row = this.db.prepare(`${SUMMARY_SQL} WHERE c.id = ?`).get(id);
    return (row as unknown as CollectionSummary | undefined) ?? null;
  }

  listForArtwork(artworkId: string): CollectionSummary[] {
    return this.db
      .prepare(
        `${SUMMARY_SQL}
         WHERE c.id IN (SELECT collection_id FROM collection_artworks
                        WHERE artwork_id = ?)
         ORDER BY sort_key(c.name)`,
      )
      .all(artworkId) as unknown as CollectionSummary[];
  }

  listRecords(): CollectionRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, created_at AS createdAt, updated_at AS updatedAt
         FROM collections ORDER BY sort_key(name)`,
      )
      .all() as unknown as Omit<CollectionRecord, "artworkIds">[];
    const members = this.db.prepare(
      "SELECT artwork_id AS id FROM collection_artworks WHERE collection_id = ?",
    );
    return rows.map((row) => ({
      ...row,
      artworkIds: (members.all(row.id) as { id: string }[]).map(({ id }) => id),
    }));
  }

  /** Replaces every collection; joins a transaction already open. */
  replaceAll(collections: readonly CollectionRecord[]): void {
    transaction(this.db, () => {
      this.db.exec("DELETE FROM collections");
      for (const collection of collections) {
        this.db
          .prepare(
            `INSERT INTO collections (id, name, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
          )
          .run(
            collection.id,
            collection.name,
            collection.createdAt,
            collection.updatedAt,
          );
        this.addArtworks(
          collection.id,
          collection.artworkIds,
          collection.updatedAt,
        );
      }
    });
  }

  /** Whether another collection uses the name, ignoring case and accents. */
  isNameTaken(name: string, exceptId: string | null): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM collections
         WHERE sort_key(name) = sort_key(?) AND id IS NOT ?`,
      )
      .get(name, exceptId);
    return row !== undefined;
  }

  insert(id: string, name: string, timestamp: string): void {
    this.db
      .prepare(
        `INSERT INTO collections (id, name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, name, timestamp, timestamp);
  }

  rename(id: string, name: string, timestamp: string): boolean {
    const { changes } = this.db
      .prepare("UPDATE collections SET name = ?, updated_at = ? WHERE id = ?")
      .run(name, timestamp, id);
    return changes > 0;
  }

  delete(id: string): DeletedCollection | null {
    return transaction(this.db, () => {
      const row = this.db
        .prepare(
          "SELECT id, name, created_at AS createdAt FROM collections WHERE id = ?",
        )
        .get(id) as
        Omit<DeletedCollection, "artworkIds" | "documentIds"> | undefined;
      if (!row) return null;
      const ids = (sql: string) =>
        (this.db.prepare(sql).all(id) as { id: string }[]).map(
          (member) => member.id,
        );
      const artworkIds = ids(
        "SELECT artwork_id AS id FROM collection_artworks WHERE collection_id = ?",
      );
      const documentIds = ids(
        "SELECT document_id AS id FROM document_collections WHERE collection_id = ?",
      );
      this.db.prepare("DELETE FROM collections WHERE id = ?").run(id);
      return { ...row, artworkIds, documentIds };
    });
  }

  restore(deleted: DeletedCollection, timestamp: string): void {
    transaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO collections (id, name, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(deleted.id, deleted.name, deleted.createdAt, timestamp);
      this.addArtworks(deleted.id, deleted.artworkIds, timestamp);
      const link = this.db.prepare(
        `INSERT OR IGNORE INTO document_collections (document_id, collection_id)
         SELECT id, ? FROM documents WHERE id = ?`,
      );
      for (const documentId of deleted.documentIds) {
        link.run(deleted.id, documentId);
      }
    });
  }

  /** Adds or removes artworks; ids of artworks that do not exist are skipped. */
  setMembership(
    id: string,
    artworkIds: readonly string[],
    member: boolean,
    timestamp: string,
  ): void {
    transaction(this.db, () => {
      if (member) {
        this.addArtworks(id, artworkIds, timestamp);
        return;
      }
      const remove = this.db.prepare(
        "DELETE FROM collection_artworks WHERE collection_id = ? AND artwork_id = ?",
      );
      for (const artworkId of artworkIds) remove.run(id, artworkId);
    });
  }

  private addArtworks(
    id: string,
    artworkIds: readonly string[],
    timestamp: string,
  ): void {
    const add = this.db.prepare(
      `INSERT OR IGNORE INTO collection_artworks
         (collection_id, artwork_id, added_at)
       SELECT ?, id, ? FROM artworks WHERE id = ?`,
    );
    for (const artworkId of artworkIds) add.run(id, timestamp, artworkId);
  }
}
