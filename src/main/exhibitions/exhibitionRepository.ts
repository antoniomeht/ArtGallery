import type { DatabaseSync } from "node:sqlite";
import type { ArtworkSummary } from "../../shared/artwork";
import type {
  Exhibition,
  ExhibitionFields,
  ExhibitionSummary,
} from "../../shared/exhibition";
import { transaction } from "../database/transaction";
import { SUMMARY_COLUMNS, toSummaries } from "../inventory/artworkRepository";

interface ExhibitionRow {
  id: string;
  name: string;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class ExhibitionRepository {
  constructor(private readonly db: DatabaseSync) {}

  listSummaries(): ExhibitionSummary[] {
    return this.db
      .prepare(
        `SELECT e.id, e.name, e.venue, e.start_date AS startDate,
                e.end_date AS endDate,
                (SELECT COUNT(*) FROM exhibition_artworks ea
                 JOIN artworks a ON a.id = ea.artwork_id
                 WHERE ea.exhibition_id = e.id AND a.deleted_at IS NULL)
                  AS artworkCount,
                (SELECT i.id FROM exhibition_artworks ea
                 JOIN artworks a ON a.id = ea.artwork_id
                 JOIN artwork_images i ON i.artwork_id = a.id AND i.position = 0
                 WHERE ea.exhibition_id = e.id AND a.deleted_at IS NULL
                 ORDER BY ea.position LIMIT 1) AS coverImageId
         FROM exhibitions e
         ORDER BY e.start_date DESC NULLS LAST, sort_key(e.name)`,
      )
      .all() as unknown as ExhibitionSummary[];
  }

  findById(id: string): Exhibition | null {
    const row = this.db
      .prepare("SELECT * FROM exhibitions WHERE id = ?")
      .get(id) as ExhibitionRow | undefined;
    if (!row) return null;
    const artworkIds = (
      this.db
        .prepare(
          `SELECT artwork_id AS id FROM exhibition_artworks
           WHERE exhibition_id = ? ORDER BY position`,
        )
        .all(id) as { id: string }[]
    ).map(({ id }) => id);
    return {
      id: row.id,
      name: row.name,
      venue: row.venue,
      startDate: row.start_date,
      endDate: row.end_date,
      description: row.description,
      artworkIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Artworks outside the trash, in exhibition order. */
  listArtworks(id: string): ArtworkSummary[] {
    return toSummaries(
      this.db
        .prepare(
          `SELECT ${SUMMARY_COLUMNS}
           FROM exhibition_artworks ea
           JOIN artworks a ON a.id = ea.artwork_id
           LEFT JOIN artwork_images i ON i.artwork_id = a.id AND i.position = 0
           WHERE ea.exhibition_id = ? AND a.deleted_at IS NULL
           ORDER BY ea.position`,
        )
        .all(id),
    );
  }

  insert(exhibition: Exhibition): void {
    transaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO exhibitions
             (id, name, venue, start_date, end_date, description,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          exhibition.id,
          exhibition.name,
          exhibition.venue,
          exhibition.startDate,
          exhibition.endDate,
          exhibition.description,
          exhibition.createdAt,
          exhibition.updatedAt,
        );
      this.writeArtworks(exhibition.id, exhibition.artworkIds);
    });
  }

  /** Returns false when no exhibition has the given id. */
  update(id: string, fields: ExhibitionFields, updatedAt: string): boolean {
    const { changes } = this.db
      .prepare(
        `UPDATE exhibitions SET name = ?, venue = ?, start_date = ?,
           end_date = ?, description = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        fields.name,
        fields.venue,
        fields.startDate,
        fields.endDate,
        fields.description,
        updatedAt,
        id,
      );
    return changes > 0;
  }

  /** Sets the artworks of the exhibition, in this order. */
  setArtworks(id: string, artworkIds: readonly string[], updatedAt: string) {
    transaction(this.db, () => {
      this.writeArtworks(id, artworkIds);
      this.db
        .prepare("UPDATE exhibitions SET updated_at = ? WHERE id = ?")
        .run(updatedAt, id);
    });
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM exhibitions WHERE id = ?").run(id);
  }

  listAll(): Exhibition[] {
    return (
      this.db.prepare("SELECT id FROM exhibitions").all() as { id: string }[]
    ).map(({ id }) => this.findById(id)!);
  }

  /** Inserts the exhibitions, replacing any with the same id. */
  upsertAll(exhibitions: readonly Exhibition[]): void {
    transaction(this.db, () => {
      exhibitions.forEach((exhibition) => {
        this.delete(exhibition.id);
        this.insert(exhibition);
      });
    });
  }

  listAllIds(): string[] {
    return (
      this.db.prepare("SELECT id FROM exhibitions").all() as { id: string }[]
    ).map(({ id }) => id);
  }

  /** Replaces every exhibition; meant to run inside a restore transaction. */
  replaceAll(exhibitions: readonly Exhibition[]): void {
    transaction(this.db, () => {
      this.db.exec("DELETE FROM exhibitions");
      exhibitions.forEach((exhibition) => this.insert(exhibition));
    });
  }

  private writeArtworks(id: string, artworkIds: readonly string[]): void {
    this.db
      .prepare("DELETE FROM exhibition_artworks WHERE exhibition_id = ?")
      .run(id);
    const insert = this.db.prepare(
      `INSERT INTO exhibition_artworks (exhibition_id, artwork_id, position)
       VALUES (?, ?, ?)`,
    );
    [...new Set(artworkIds)].forEach((artworkId, position) =>
      insert.run(id, artworkId, position),
    );
  }
}
