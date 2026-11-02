import { randomUUID } from "node:crypto";
import {
  artworkFieldsSchema,
  artworkQuerySchema,
  newArtworkSchema,
  type Artwork,
  type ArtworkFieldsInput,
  type ArtworkQuery,
  type ArtworkStatus,
  type ArtworkSummary,
  type FilterOptions,
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

  listArtworks(query: ArtworkQuery = {}): ArtworkSummary[] {
    const { sort, ...filter } = artworkQuerySchema.parse(query);
    return this.artworks.listSummaries({ sort, filter });
  }

  listFilterOptions(): FilterOptions {
    return this.artworks.listFilterOptions();
  }

  setStatus(ids: readonly string[], status: ArtworkStatus): void {
    this.artworks.setStatus(ids, status, this.timestamp());
  }

  listTrash(): ArtworkSummary[] {
    return this.artworks.listSummaries({ inTrash: true });
  }

  /** Recoverable: the artworks keep all their data and images. */
  moveToTrash(ids: readonly string[]): void {
    this.artworks.setDeletedAt(ids, this.timestamp());
  }

  restoreFromTrash(ids: readonly string[]): void {
    this.artworks.setDeletedAt(ids, null);
  }

  /**
   * Permanently deletes artworks that are in the trash (all of them when
   * `ids` is omitted). Artworks outside the trash are never touched.
   */
  async deleteFromTrash(ids?: readonly string[]): Promise<void> {
    const images = this.artworks.deleteFromTrash(ids);
    // Files go only after the database change is committed.
    await Promise.all(images.map((image) => this.images.deleteImage(image)));
  }

  getArtwork(id: string): Artwork {
    const artwork = this.artworks.findById(id);
    if (!artwork) throw new Error(`Artwork not found: ${id}`);
    return artwork;
  }

  updateArtwork(id: string, input: ArtworkFieldsInput): Artwork {
    const fields = artworkFieldsSchema.parse(input);
    if (!this.artworks.update(id, fields, this.timestamp())) {
      throw new Error(`Artwork not found: ${id}`);
    }
    return this.getArtwork(id);
  }

  async createArtwork(input: NewArtwork): Promise<ArtworkSummary> {
    const { title, artist, imagePaths } = newArtworkSchema.parse(input);
    return this.withImportedImages(imagePaths, (stored) => {
      const record = {
        id: randomUUID(),
        title,
        artist,
        createdAt: this.timestamp(),
      };
      this.artworks.insert(record, stored);
      return {
        ...record,
        primaryImageId: stored[0]?.id ?? null,
        deletedAt: null,
      };
    });
  }

  /** Adds images after the existing ones, keeping the primary image. */
  async addImages(
    artworkId: string,
    imagePaths: readonly string[],
  ): Promise<Artwork> {
    this.getArtwork(artworkId);
    await this.withImportedImages(imagePaths, (stored) =>
      this.artworks.appendImages(artworkId, stored, this.timestamp()),
    );
    return this.getArtwork(artworkId);
  }

  /** Removes an image; if it was the primary one, the next image takes over. */
  async removeImage(artworkId: string, imageId: string): Promise<Artwork> {
    const removed = this.artworks.removeImage(
      artworkId,
      imageId,
      this.timestamp(),
    );
    if (!removed) throw new Error(`Image not found: ${imageId}`);
    // Files go only after the database change is committed.
    await this.images.deleteImage(removed);
    return this.getArtwork(artworkId);
  }

  setPrimaryImage(artworkId: string, imageId: string): Artwork {
    const artwork = this.getArtwork(artworkId);
    const ids = artwork.images.map((image) => image.id);
    if (!ids.includes(imageId)) throw new Error(`Image not found: ${imageId}`);

    this.artworks.reorderImages(
      artworkId,
      [imageId, ...ids.filter((id) => id !== imageId)],
      this.timestamp(),
    );
    return this.getArtwork(artworkId);
  }

  /**
   * Copies the images into the store and then runs `save`. If any step
   * fails, the copied files are removed so no orphan data is left behind.
   */
  private async withImportedImages<T>(
    paths: readonly string[],
    save: (stored: StoredImage[]) => T,
  ): Promise<T> {
    const stored: StoredImage[] = [];
    try {
      for (const path of paths) {
        stored.push(await this.images.importImage(path));
      }
      return save(stored);
    } catch (error) {
      await Promise.all(stored.map((image) => this.images.deleteImage(image)));
      throw error;
    }
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
