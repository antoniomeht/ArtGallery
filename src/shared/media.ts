/** Custom protocol that serves images from the app's own storage. */
export const MEDIA_SCHEME = "artgallery-media";

export const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
];

export function isSupportedImage(path: string): boolean {
  const lower = path.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  );
}

export function originalUrl(fileName: string): string {
  return `${MEDIA_SCHEME}://originals/${fileName}`;
}

export function documentFileUrl(fileName: string): string {
  return `${MEDIA_SCHEME}://documents/${fileName}`;
}

export function thumbnailUrl(imageId: string): string {
  return `${MEDIA_SCHEME}://thumbnails/${imageId}.webp`;
}
