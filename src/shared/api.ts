import type { ArtworkSummary, NewArtwork } from "./artwork";

/** Contract exposed by the preload script as `window.artGallery`. */
export interface ArtGalleryApi {
  listArtworks(): Promise<ArtworkSummary[]>;
  createArtwork(input: NewArtwork): Promise<ArtworkSummary>;
  /** Opens the system file picker and returns the chosen image paths. */
  pickImages(): Promise<string[]>;
}

export const IpcChannel = {
  listArtworks: "artworks:list",
  createArtwork: "artworks:create",
  pickImages: "dialog:pick-images",
} as const satisfies Record<keyof ArtGalleryApi, string>;
