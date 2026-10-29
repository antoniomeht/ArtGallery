import type { DatabaseSync } from "node:sqlite";
import type { ArtworkSummary } from "../../shared/artwork";
import { transaction } from "../database/transaction";
import type { StoredImage } from "../images/imageStore";

export interface ArtworkRecord {
  id: string;
  title: string;
  artist: string | null;
  createdAt: string;
}

export class ArtworkRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(artwork: ArtworkRecord, images: readonly StoredImage[]): void {
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
