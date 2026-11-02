import type {
  Artwork,
  ArtworkFieldsInput,
  ArtworkSummary,
  NewArtwork,
} from "./artwork";

/** Contract exposed by the preload script as `window.artGallery`. */
export interface ArtGalleryApi {
  listArtworks(): Promise<ArtworkSummary[]>;
  getArtwork(id: string): Promise<Artwork>;
  createArtwork(input: NewArtwork): Promise<ArtworkSummary>;
  updateArtwork(id: string, fields: ArtworkFieldsInput): Promise<Artwork>;
  addImages(artworkId: string, imagePaths: string[]): Promise<Artwork>;
  removeImage(artworkId: string, imageId: string): Promise<Artwork>;
  setPrimaryImage(artworkId: string, imageId: string): Promise<Artwork>;
  listTrash(): Promise<ArtworkSummary[]>;
  moveToTrash(artworkIds: string[]): Promise<void>;
  restoreFromTrash(artworkIds: string[]): Promise<void>;
  /** Permanent: removes the artworks and their images. */
  deleteFromTrash(artworkIds: string[]): Promise<void>;
  emptyTrash(): Promise<void>;
  /** Opens the system file picker and returns the chosen image paths. */
  pickImages(): Promise<string[]>;
}

export const IpcChannel = {
  listArtworks: "artworks:list",
  getArtwork: "artworks:get",
  createArtwork: "artworks:create",
  updateArtwork: "artworks:update",
  addImages: "artworks:add-images",
  removeImage: "artworks:remove-image",
  setPrimaryImage: "artworks:set-primary-image",
  listTrash: "trash:list",
  moveToTrash: "trash:move",
  restoreFromTrash: "trash:restore",
  deleteFromTrash: "trash:delete",
  emptyTrash: "trash:empty",
  pickImages: "dialog:pick-images",
} as const satisfies Record<keyof ArtGalleryApi, string>;
