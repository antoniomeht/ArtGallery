import type { Artwork } from "../../shared/artwork";
import type { ImageStore } from "../images/imageStore";
import type { ExportArtwork } from "./writePackage";

/** Pairs an inventory artwork with the stored originals of its images. */
export function toExportArtwork(
  artwork: Artwork,
  images: ImageStore,
): ExportArtwork {
  return {
    ...artwork,
    images: artwork.images.map(({ id, fileName }) => ({
      id,
      fileName,
      path: images.originalPath(fileName),
    })),
  };
}
