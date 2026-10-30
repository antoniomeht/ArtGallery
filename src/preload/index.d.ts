import type { ArtGalleryApi } from "../shared/api";

declare global {
  interface Window {
    artGallery: ArtGalleryApi;
  }
}
