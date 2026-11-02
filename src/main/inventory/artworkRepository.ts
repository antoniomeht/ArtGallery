import type { DatabaseSync } from "node:sqlite";
import type {
  Artwork,
  ArtworkFields,
  ArtworkImage,
  ArtworkStatus,
  ArtworkSummary,
  DimensionUnit,
} from "../../shared/artwork";
import { transaction } from "../database/transaction";
import type { StoredImage } from "../images/imageStore";

export interface NewArtworkRecord {
  id: string;
  title: string;
  artist: string | null;
  createdAt: string;
}

interface ArtworkRow {
  id: string;
  title: string;
  artist: string | null;
  category: string | null;
  technique: string | null;
  support: string | null;
  year: number | null;
  year_approximate: number;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: DimensionUnit;
  description: string | null;
  notes: string | null;
  location: string | null;
  status: ArtworkStatus;
  price_cents: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export class ArtworkRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(artwork: NewArtworkRecord, images: readonly StoredImage[]): void {
    transaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO artworks (id, title, artist, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          artwork.id,
          artwork.title,
          artwork.artist,
          artwork.createdAt,
          artwork.createdAt,
        );

      const insertImage = this.db.prepare(
        `INSERT INTO artwork_images (id, artwork_id, file_name, position)
         VALUES (?, ?, ?, ?)`,
      );
      images.forEach((image, position) =>
        insertImage.run(image.id, artwork.id, image.fileName, position),
      );
    });
  }

  /** Returns false when no artwork has the given id. */
  update(id: string, fields: ArtworkFields, updatedAt: string): boolean {
    return transaction(this.db, () => {
      const { changes } = this.db
        .prepare(
          `UPDATE artworks SET
             title = ?, artist = ?, category = ?, technique = ?, support = ?,
             year = ?, year_approximate = ?, height = ?, width = ?, depth = ?,
             dimension_unit = ?, description = ?, notes = ?, location = ?,
             status = ?, price_cents = ?, currency = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          fields.title,
          fields.artist,
          fields.category,
          fields.technique,
          fields.support,
          fields.year,
          fields.yearApproximate ? 1 : 0,
          fields.height,
          fields.width,
          fields.depth,
          fields.dimensionUnit,
          fields.description,
          fields.notes,
          fields.location,
          fields.status,
          fields.price == null ? null : Math.round(fields.price * 100),
          fields.currency,
          updatedAt,
          id,
        );
      if (changes === 0) return false;

      this.db.prepare("DELETE FROM artwork_tags WHERE artwork_id = ?").run(id);
      const insertTag = this.db.prepare(
        "INSERT OR IGNORE INTO artwork_tags (artwork_id, tag) VALUES (?, ?)",
      );
      fields.tags.forEach((tag) => insertTag.run(id, tag));
      return true;
    });
  }

  findById(id: string): Artwork | null {
    const row = this.db
      .prepare("SELECT * FROM artworks WHERE id = ?")
      .get(id) as ArtworkRow | undefined;
    if (!row) return null;

    const tags = this.db
      .prepare(
        "SELECT tag FROM artwork_tags WHERE artwork_id = ? ORDER BY tag COLLATE NOCASE",
      )
      .all(id) as { tag: string }[];
    const images = this.db
      .prepare(
        `SELECT id, file_name AS fileName FROM artwork_images
         WHERE artwork_id = ? ORDER BY position`,
      )
      .all(id) as unknown as ArtworkImage[];

    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      category: row.category,
      technique: row.technique,
      support: row.support,
      year: row.year,
      yearApproximate: row.year_approximate === 1,
      height: row.height,
      width: row.width,
      depth: row.depth,
      dimensionUnit: row.dimension_unit,
      description: row.description,
      notes: row.notes,
      tags: tags.map(({ tag }) => tag),
      location: row.location,
      status: row.status,
      price: row.price_cents == null ? null : row.price_cents / 100,
      currency: row.currency,
      images,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  listSummaries(): ArtworkSummary[] {
    return this.db
      .prepare(
        `SELECT a.id, a.title, a.artist, a.created_at AS createdAt,
                i.id AS primaryImageId
         FROM artworks a
         LEFT JOIN artwork_images i ON i.artwork_id = a.id AND i.position = 0
         ORDER BY a.created_at DESC`,
      )
      .all() as unknown as ArtworkSummary[];
  }
}
