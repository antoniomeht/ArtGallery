import { randomUUID } from "node:crypto";
import {
  newArtworkSchema,
  type ArtworkSummary,
  type NewArtwork,
} from "../../shared/artwork";
import type { ImageStore, StoredImage } from "../images/imageStore";
import type { ArtworkRepository } from "./artworkRepository";

export class InventoryService {
  constructor(
    private readonly artworks: ArtworkRepository,
    private readonly images: ImageStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listArtworks(): ArtworkSummary[] {
    return this.artworks.listSummaries();
  }

  /**
   * Copies the images into the store and then saves the artwork. If any step
   * fails, the copied files are removed so no orphan data is left behind.
   */
  async createArtwork(input: NewArtwork): Promise<ArtworkSummary> {
    const { title, artist, imagePaths } = newArtworkSchema.parse(input);
    const stored: StoredImage[] = [];

    try {
      for (const path of imagePaths) {
        stored.push(await this.images.importImage(path));
      }
      const record = {
        id: randomUUID(),
        title,
        artist: artist || null,
        createdAt: this.now().toISOString(),
      };
      this.artworks.insert(record, stored);
      return { ...record, primaryImageId: stored[0]?.id ?? null };
    } catch (error) {
      await Promise.all(stored.map((image) => this.images.deleteImage(image)));
      throw error;
    }
  }
}
