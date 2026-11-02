import type { RestoredArtwork } from "../inventory/inventoryService";
import type { PackageArtwork } from "./packageFormat";
import type { ValidatedPackage } from "./readPackage";

/** Points each artwork of a validated package at its extracted images. */
export function restoredArtworks(
  pkg: ValidatedPackage,
  artworks: readonly PackageArtwork[],
): RestoredArtwork[] {
  return artworks.map(({ images, ...artwork }) => ({
    ...artwork,
    imagePaths: images.map((image) => pkg.imagePath(image.file)),
  }));
}
