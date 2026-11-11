import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  Artwork,
  ArtworkFields,
  ArtworkFilter,
  ArtworkImage,
  ArtworkSort,
  ArtworkStatus,
  ArtworkSummary,
  FilterOptions,
} from "../../shared/artwork";
import { transaction } from "../database/transaction";
import type { StoredImage } from "../images/imageStore";
import { buildFilterConditions } from "./artworkFilter";

export interface NewArtworkRecord {
  id: string;
  title: string;
  artist: string | null;
  needsReview: boolean;
  createdAt: string;
}

/** Columns of an `ArtworkSummary`, from `artworks a` and its cover `i`. */
export const SUMMARY_COLUMNS = `a.id, a.title, a.artist, a.created_at AS createdAt,
  a.deleted_at AS deletedAt, a.needs_review AS needsReview,
  a.favorite AS favorite,
  i.id AS primaryImageId`;

/** Rows selected with `SUMMARY_COLUMNS`, with SQLite's 0/1 as booleans. */
export function toSummaries(rows: unknown[]): ArtworkSummary[] {
  type Row = Omit<ArtworkSummary, "needsReview" | "favorite"> & {
    needsReview: number;
    favorite: number;
  };
  return (rows as Row[]).map((row) => ({
    ...row,
    needsReview: row.needsReview === 1,
    favorite: row.favorite === 1,
  }));
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
  height_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  height_in: number | null;
  width_in: number | null;
  depth_in: number | null;
  description: string | null;
  notes: string | null;
  location: string | null;
  status: ArtworkStatus;
  price_cents: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  needs_review: number;
  favorite: number;
  inventory_number: string | null;
}

/** Every order puts favourites first. */
const ORDER_BY: Record<ArtworkSort, string> = {
  recent: "a.favorite DESC, a.created_at DESC",
  oldest: "a.favorite DESC, a.created_at ASC",
  title: "a.favorite DESC, sort_key(a.title), a.created_at DESC",
  "year-asc": "a.favorite DESC, a.year ASC NULLS LAST, sort_key(a.title)",
  "year-desc": "a.favorite DESC, a.year DESC NULLS LAST, sort_key(a.title)",
};

/** Editable columns, in the order `fieldValues` returns their values. */
const FIELD_COLUMNS = [
  "title",
  "artist",
  "category",
  "technique",
  "support",
  "year",
  "year_approximate",
  "height_cm",
  "width_cm",
  "depth_cm",
  "height_in",
  "width_in",
  "depth_in",
  "description",
  "notes",
  "location",
  "status",
  "price_cents",
  "currency",
  "inventory_number",
];

function fieldValues(fields: ArtworkFields): SQLInputValue[] {
  return [
    fields.title,
    fields.artist,
    fields.category,
    fields.technique,
    fields.support,
    fields.year,
    fields.yearApproximate ? 1 : 0,
    fields.dimensions.cm.height,
    fields.dimensions.cm.width,
    fields.dimensions.cm.depth,
    fields.dimensions.in.height,
    fields.dimensions.in.width,
    fields.dimensions.in.depth,
    fields.description,
    fields.notes,
    fields.location,
    fields.status,
    // Prices are stored in cents to avoid floating point rounding.
    fields.price == null ? null : Math.round(fields.price * 100),
    fields.currency,
    fields.inventoryNumber,
  ];
}

/** `?, ?, ?` for an SQL `IN (...)` list. */
const placeholders = (values: readonly unknown[]) =>
  values.map(() => "?").join(", ");

/** Tables that link other things to an artwork by `artwork_id`. */
const LINK_TABLES = [
  "exhibition_artworks",
  "collection_artworks",
  "document_artworks",
] as const;

export class ArtworkRepository {
  constructor(private readonly db: DatabaseSync) {}

  /** Runs `work` in one transaction, together with other repositories. */
  inTransaction<T>(work: () => T): T {
    return transaction(this.db, work);
  }

  insert(artwork: NewArtworkRecord, images: readonly StoredImage[]): void {
    transaction(this.db, () => {
      this.db
        .prepare(
          `INSERT INTO artworks
             (id, title, artist, needs_review, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          artwork.id,
          artwork.title,
          artwork.artist,
          artwork.needsReview ? 1 : 0,
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

  /**
   * Saves the record, which also clears `needsReview`. Returns false when no
   * artwork has the given id.
   */
  update(id: string, fields: ArtworkFields, updatedAt: string): boolean {
    return transaction(this.db, () => {
      const assignments = FIELD_COLUMNS.map((column) => `${column} = ?`);
      const { changes } = this.db
        .prepare(
          `UPDATE artworks
           SET ${assignments.join(", ")}, needs_review = 0, updated_at = ?
           WHERE id = ?`,
        )
        .run(...fieldValues(fields), updatedAt, id);
      if (changes === 0) return false;

      this.writeTags(id, fields.tags);
      return true;
    });
  }

  /**
   * Replaces the whole inventory with `artworks`, keeping their ids, dates
   * and image order. Everything happens in one transaction.
   */
  replaceAll(artworks: readonly Artwork[]): void {
    transaction(this.db, () => {
      this.db.exec("DELETE FROM artworks");
      for (const artwork of artworks) this.insertComplete(artwork);
    });
  }

  /**
   * Inserts the artworks, replacing any that already exist with the same id.
   * A replaced artwork stays in its exhibitions and collections and keeps
   * its documents: deleting the row would drop those links in cascade.
   */
  upsertAll(artworks: readonly Artwork[]): void {
    transaction(this.db, () => {
      const remove = this.db.prepare("DELETE FROM artworks WHERE id = ?");
      for (const artwork of artworks) {
        const links = LINK_TABLES.map((table) => ({
          table,
          rows: this.db
            .prepare(`SELECT * FROM ${table} WHERE artwork_id = ?`)
            .all(artwork.id) as Record<string, SQLInputValue>[],
        }));
        remove.run(artwork.id);
        this.insertComplete(artwork);
        for (const { table, rows } of links) {
          for (const row of rows) {
            const columns = Object.keys(row);
            this.db
              .prepare(
                `INSERT OR IGNORE INTO ${table} (${columns.join(", ")})
                 VALUES (${columns.map(() => "?").join(", ")})`,
              )
              .run(...columns.map((column) => row[column] ?? null));
          }
        }
      }
    });
  }

  /** Every artwork id, including those in the trash. */
  listAllIds(): string[] {
    return (
      this.db.prepare("SELECT id FROM artworks").all() as { id: string }[]
    ).map(({ id }) => id);
  }

  listImagesOf(artworkIds: readonly string[]): StoredImage[] {
    if (artworkIds.length === 0) return [];
    return this.db
      .prepare(
        `SELECT id, file_name AS fileName FROM artwork_images
         WHERE artwork_id IN (${placeholders(artworkIds)})`,
      )
      .all(...artworkIds) as unknown as StoredImage[];
  }

  listAllImages(): StoredImage[] {
    return this.db
      .prepare("SELECT id, file_name AS fileName FROM artwork_images")
      .all() as unknown as StoredImage[];
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
      inventoryNumber: row.inventory_number,
      artist: row.artist,
      category: row.category,
      technique: row.technique,
      support: row.support,
      year: row.year,
      yearApproximate: row.year_approximate === 1,
      dimensions: {
        cm: { height: row.height_cm, width: row.width_cm, depth: row.depth_cm },
        in: { height: row.height_in, width: row.width_in, depth: row.depth_in },
      },
      description: row.description,
      notes: row.notes,
      tags: tags.map(({ tag }) => tag),
      location: row.location,
      status: row.status,
      price: row.price_cents == null ? null : row.price_cents / 100,
      currency: row.currency,
      images,
      needsReview: row.needs_review === 1,
      favorite: row.favorite === 1,
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
    return toSummaries(
      this.db
        .prepare(
          `SELECT ${SUMMARY_COLUMNS}
           FROM artworks a
           LEFT JOIN artwork_images i ON i.artwork_id = a.id AND i.position = 0
           WHERE ${where}
           ORDER BY ${inTrash ? "a.deleted_at DESC" : ORDER_BY[sort]}`,
        )
        .all(...conditions.flatMap(({ params }) => params)),
    );
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
      supports: distinct("a.support"),
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

  /** Not a change to the record, so its date of change stays. */
  setFavorite(id: string, favorite: boolean): void {
    this.db
      .prepare("UPDATE artworks SET favorite = ? WHERE id = ?")
      .run(favorite ? 1 : 0, id);
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

  private insertComplete(artwork: Artwork): void {
    this.db
      .prepare(
        `INSERT INTO artworks
           (id, ${FIELD_COLUMNS.join(", ")}, needs_review, favorite,
            created_at, updated_at, deleted_at)
         VALUES (?, ${placeholders(FIELD_COLUMNS)}, ?, ?, ?, ?, ?)`,
      )
      .run(
        artwork.id,
        ...fieldValues(artwork),
        artwork.needsReview ? 1 : 0,
        artwork.favorite ? 1 : 0,
        artwork.createdAt,
        artwork.updatedAt,
        artwork.deletedAt,
      );
    this.writeTags(artwork.id, artwork.tags);
    this.insertImages(artwork.id, artwork.images, 0);
  }

  private writeTags(artworkId: string, tags: readonly string[]): void {
    this.db
      .prepare("DELETE FROM artwork_tags WHERE artwork_id = ?")
      .run(artworkId);
    const insertTag = this.db.prepare(
      "INSERT OR IGNORE INTO artwork_tags (artwork_id, tag) VALUES (?, ?)",
    );
    tags.forEach((tag) => insertTag.run(artworkId, tag));
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
