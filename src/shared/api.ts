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
  pickImages: "dialog:pick-images",
} as const satisfies Record<keyof ArtGalleryApi, string>;
