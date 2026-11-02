import type { DatabaseSync } from "node:sqlite";
import type {
  Artwork,
  ArtworkFields,
  ArtworkFilter,
  ArtworkImage,
  ArtworkSort,
  ArtworkStatus,
  ArtworkSummary,
  DimensionUnit,
  FilterOptions,
} from "../../shared/artwork";
import { transaction } from "../database/transaction";
import type { StoredImage } from "../images/imageStore";
import { buildFilterConditions } from "./artworkFilter";

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
  deleted_at: string | null;
}

const ORDER_BY: Record<ArtworkSort, string> = {
  recent: "a.created_at DESC",
  oldest: "a.created_at ASC",
  title: "sort_key(a.title), a.created_at DESC",
  "year-asc": "a.year ASC NULLS LAST, sort_key(a.title)",
  "year-desc": "a.year DESC NULLS LAST, sort_key(a.title)",
};

/** `?, ?, ?` for an SQL `IN (...)` list. */
const placeholders = (values: readonly unknown[]) =>
  values.map(() => "?").join(", ");

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
      this.insertImages(artwork.id, images, 0);
    });
  }

  appendImages(
    artworkId: string,
    images: readonly StoredImage[],
    updatedAt: string,
  ): void {
    transaction(this.db, () => {
      const { count } = this.db
        .prepare(
          "SELECT COUNT(*) AS count FROM artwork_images WHERE artwork_id = ?",
        )
        .get(artworkId) as { count: number };
      this.insertImages(artworkId, images, count);
      this.touch(artworkId, updatedAt);
    });
  }

  /**
   * Deletes the image row and closes the gap in the order. Returns the
   * removed image, or null if it does not belong to the artwork.
   */
  removeImage(
    artworkId: string,
    imageId: string,
    updatedAt: string,
  ): StoredImage | null {
    return transaction(this.db, () => {
      const image = this.db
        .prepare(
          `SELECT id, file_name AS fileName FROM artwork_images
           WHERE id = ? AND artwork_id = ?`,
        )
        .get(imageId, artworkId) as StoredImage | undefined;
      if (!image) return null;

      this.db.prepare("DELETE FROM artwork_images WHERE id = ?").run(imageId);
      const remaining = this.db
        .prepare(
          "SELECT id FROM artwork_images WHERE artwork_id = ? ORDER BY position",
        )
        .all(artworkId) as { id: string }[];
      this.writeImageOrder(
        artworkId,
        remaining.map(({ id }) => id),
      );
      this.touch(artworkId, updatedAt);
      return image;
    });
  }

  /** `imageIds` must list every image of the artwork in the new order. */
  reorderImages(
    artworkId: string,
    imageIds: readonly string[],
    updatedAt: string,
  ): void {
    transaction(this.db, () => {
      this.writeImageOrder(artworkId, imageIds);
      this.touch(artworkId, updatedAt);
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
      deletedAt: row.deleted_at,
    };
  }

  listSummaries({
    inTrash = false,
    sort = "recent",
    filter = {},
  }: {
    inTrash?: boolean;
    sort?: ArtworkSort;
    filter?: ArtworkFilter;
  } = {}): ArtworkSummary[] {
    const conditions = buildFilterConditions(filter);
    const where = [
      `a.deleted_at IS ${inTrash ? "NOT NULL" : "NULL"}`,
      ...conditions.map(({ sql }) => sql),
    ].join(" AND ");
    return this.db
      .prepare(
        `SELECT a.id, a.title, a.artist, a.created_at AS createdAt,
                a.deleted_at AS deletedAt, i.id AS primaryImageId
         FROM artworks a
         LEFT JOIN artwork_images i ON i.artwork_id = a.id AND i.position = 0
         WHERE ${where}
         ORDER BY ${inTrash ? "a.deleted_at DESC" : ORDER_BY[sort]}`,
      )
      .all(
        ...conditions.flatMap(({ params }) => params),
      ) as unknown as ArtworkSummary[];
  }

  /** Distinct values outside the trash, one spelling per accent/case variant. */
  listFilterOptions(): FilterOptions {
    const distinct = (column: string, from = "artworks a") =>
      (
        this.db
          .prepare(
            `SELECT MIN(${column}) AS value FROM ${from}
             WHERE a.deleted_at IS NULL AND ${column} IS NOT NULL
             GROUP BY sort_key(${column}) ORDER BY sort_key(${column})`,
          )
          .all() as { value: string }[]
      ).map(({ value }) => value);

    return {
      categories: distinct("a.category"),
      artists: distinct("a.artist"),
      techniques: distinct("a.technique"),
      locations: distinct("a.location"),
      tags: distinct(
        "t.tag",
        "artwork_tags t JOIN artworks a ON a.id = t.artwork_id",
      ),
    };
  }

  setStatus(
    ids: readonly string[],
    status: ArtworkStatus,
    updatedAt: string,
  ): void {
    if (ids.length === 0) return;
    this.db
      .prepare(
        `UPDATE artworks SET status = ?, updated_at = ?
         WHERE id IN (${placeholders(ids)})`,
      )
      .run(status, updatedAt, ...ids);
  }

  /** Moves the given artworks into the trash (or out with `null`). */
  setDeletedAt(ids: readonly string[], deletedAt: string | null): number {
    if (ids.length === 0) return 0;
    const { changes } = this.db
      .prepare(
        `UPDATE artworks SET deleted_at = ?
         WHERE id IN (${placeholders(ids)})
           AND deleted_at IS ${deletedAt ? "NULL" : "NOT NULL"}`,
      )
      .run(deletedAt, ...ids);
    return Number(changes);
  }

  /**
   * Deletes artworks that are in the trash (all of them when `ids` is
   * omitted) and returns their images so the files can be removed.
   */
  deleteFromTrash(ids?: readonly string[]): StoredImage[] {
    return transaction(this.db, () => {
      const filter = ids
        ? `deleted_at IS NOT NULL AND id IN (${placeholders(ids)})`
        : "deleted_at IS NOT NULL";
      const params = ids ?? [];
      const images = this.db
        .prepare(
          `SELECT id, file_name AS fileName FROM artwork_images
           WHERE artwork_id IN (SELECT id FROM artworks WHERE ${filter})`,
        )
        .all(...params) as unknown as StoredImage[];
      this.db.prepare(`DELETE FROM artworks WHERE ${filter}`).run(...params);
      return images;
    });
  }

  private insertImages(
    artworkId: string,
    images: readonly StoredImage[],
    firstPosition: number,
  ): void {
    const insertImage = this.db.prepare(
      `INSERT INTO artwork_images (id, artwork_id, file_name, position)
       VALUES (?, ?, ?, ?)`,
    );
    images.forEach((image, index) =>
      insertImage.run(
        image.id,
        artworkId,
        image.fileName,
        firstPosition + index,
      ),
    );
  }

  private writeImageOrder(artworkId: string, imageIds: readonly string[]) {
    // Positions are unique per artwork, so move them out of the way first.
    this.db
      .prepare(
        "UPDATE artwork_images SET position = -1 - position WHERE artwork_id = ?",
      )
      .run(artworkId);
    const setPosition = this.db.prepare(
      "UPDATE artwork_images SET position = ? WHERE id = ? AND artwork_id = ?",
    );
    imageIds.forEach((id, position) =>
      setPosition.run(position, id, artworkId),
    );
  }

  private touch(artworkId: string, updatedAt: string): void {
    this.db
      .prepare("UPDATE artworks SET updated_at = ? WHERE id = ?")
      .run(updatedAt, artworkId);
  }
}
