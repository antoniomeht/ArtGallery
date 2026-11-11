import { randomUUID } from "node:crypto";
import { basename, parse } from "node:path";
import { z } from "zod";
import {
  artworkFieldsSchema,
  artworkQuerySchema,
  newArtworkSchema,
  type Artwork,
  type ArtworkFieldsInput,
  type ArtworkQuery,
  type ArtworkStatus,
  type ArtworkSummary,
  type CreationProgress,
  type FilterOptions,
  type NewArtwork,
} from "../../shared/artwork";
import type { Exhibition } from "../../shared/exhibition";
import type { ExhibitionRepository } from "../exhibitions/exhibitionRepository";
import type { ImageStore, StoredImage } from "../images/imageStore";
import type { ArtworkRepository } from "./artworkRepository";

const MAX_IMAGES_AT_ONCE = 500;

/** The file name without extension, which is how a photo is usually known. */
function titleFromPath(path: string): string {
  return parse(path).name.trim().slice(0, 300) || "Sin título";
}

/** A complete artwork to restore, with the files of its images in order. */
export type RestoredArtwork = Omit<Artwork, "images"> & {
  imagePaths: string[];
};

export interface InventoryServiceOptions {
  artworks: ArtworkRepository;
  exhibitions: ExhibitionRepository;
  images: ImageStore;
  now?: () => Date;
}

export class InventoryService {
  private readonly artworks: ArtworkRepository;
  private readonly exhibitions: ExhibitionRepository;
  private readonly images: ImageStore;
  private readonly now: () => Date;

  constructor(options: InventoryServiceOptions) {
    this.artworks = options.artworks;
    this.exhibitions = options.exhibitions;
    this.images = options.images;
    this.now = options.now ?? (() => new Date());
  }

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

  setFavorite(id: string, favorite: boolean): void {
    this.artworks.setFavorite(id, favorite);
  }

  /** Every artwork with all its data, including those in the trash. */
  listAllArtworks(): Artwork[] {
    return this.artworks.listAllIds().map((id) => this.getArtwork(id));
  }

  /**
   * Replaces the whole inventory. New images are copied first and the
   * database is replaced in one transaction; the old image files are removed
   * only after that succeeds. On failure the inventory stays as it was.
   */
  async replaceInventory(
    artworks: readonly RestoredArtwork[],
    exhibitions: readonly Exhibition[],
    /** Further replacements that must succeed or fail together with these. */
    alsoReplace: () => void = () => undefined,
  ): Promise<void> {
    await this.writeRestored(
      artworks,
      this.artworks.listAllImages(),
      (complete) =>
        this.artworks.inTransaction(() => {
          this.artworks.replaceAll(complete);
          this.exhibitions.replaceAll(exhibitions);
          alsoReplace();
        }),
    );
  }

  /** Every exhibition, for backups. */
  listAllExhibitions(): Exhibition[] {
    return this.exhibitions.listAll();
  }

  /**
   * Adds complete artworks and exhibitions, keeping their ids; any with an
   * existing id is replaced, images included. All of it in one transaction.
   * Exhibitions only keep references to artworks that end up in the
   * inventory.
   */
  async importArtworks(
    artworks: readonly RestoredArtwork[],
    exhibitions: readonly Exhibition[] = [],
  ): Promise<void> {
    const available = new Set([
      ...this.artworks.listAllIds(),
      ...artworks.map(({ id }) => id),
    ]);
    await this.writeRestored(
      artworks,
      this.artworks.listImagesOf(artworks.map(({ id }) => id)),
      (complete) =>
        this.artworks.inTransaction(() => {
          this.artworks.upsertAll(complete);
          this.exhibitions.upsertAll(
            exhibitions.map((exhibition) => ({
              ...exhibition,
              artworkIds: exhibition.artworkIds.filter((id) =>
                available.has(id),
              ),
            })),
          );
        }),
    );
  }

  /** Ids of every artwork, including those in the trash. */
  artworkIds(): Set<string> {
    return new Set(this.artworks.listAllIds());
  }

  exhibitionIds(): Set<string> {
    return new Set(this.exhibitions.listAllIds());
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
        needsReview: false,
        createdAt: this.timestamp(),
      };
      this.artworks.insert(record, stored);
      return {
        ...record,
        favorite: false,
        primaryImageId: stored[0]?.id ?? null,
        deletedAt: null,
      };
    });
  }

  /**
   * Creates one artwork per image, named after its file. Either every artwork
   * is created or, if any image cannot be imported, none is.
   */
  async createArtworksFromImages(
    imagePaths: readonly string[],
    artist: string,
    onProgress?: (progress: CreationProgress) => void,
  ): Promise<ArtworkSummary[]> {
    const paths = z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_IMAGES_AT_ONCE)
      .parse(imagePaths);
    const reportImport = (index: number) =>
      onProgress?.({
        done: index,
        total: paths.length,
        fileName: basename(paths[index] ?? ""),
      });
    return this.withImportedImages(
      paths,
      (stored) =>
        this.artworks.inTransaction(() =>
          stored.map((image, index) => {
            const record = {
              id: randomUUID(),
              title: titleFromPath(paths[index] ?? ""),
              artist: artist || null,
              needsReview: true,
              createdAt: this.timestamp(),
            };
            this.artworks.insert(record, [image]);
            return {
              ...record,
              favorite: false,
              primaryImageId: image.id,
              deletedAt: null,
            };
          }),
        ),
      reportImport,
    );
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
   * Copies the images of `artworks` into the store, writes them with `write`
   * and only then removes the files of `replacedImages`. On failure the new
   * copies are removed and nothing changes.
   */
  private async writeRestored(
    artworks: readonly RestoredArtwork[],
    replacedImages: readonly StoredImage[],
    write: (artworks: Artwork[]) => void,
  ): Promise<void> {
    await this.withImportedImages(
      artworks.flatMap(({ imagePaths }) => imagePaths),
      (stored) => {
        let next = 0;
        write(
          artworks.map(({ imagePaths, ...artwork }) => ({
            ...artwork,
            images: imagePaths.map(() => stored[next++]!),
          })),
        );
      },
    );
    await Promise.all(
      replacedImages.map((image) => this.images.deleteImage(image)),
    );
  }

  /**
   * Copies the images into the store and then runs `save`. If any step
   * fails, the copied files are removed so no orphan data is left behind.
   */
  private async withImportedImages<T>(
    paths: readonly string[],
    save: (stored: StoredImage[]) => T,
    beforeImport?: (index: number) => void,
  ): Promise<T> {
    const stored: StoredImage[] = [];
    try {
      for (const [index, path] of paths.entries()) {
        beforeImport?.(index);
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
