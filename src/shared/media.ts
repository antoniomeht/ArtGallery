/** Custom protocol that serves images from the app's own storage. */
export const MEDIA_SCHEME = "artgallery-media";

export function thumbnailUrl(imageId: string): string {
  return `${MEDIA_SCHEME}://thumbnails/${imageId}.webp`;
}
