import type { Artwork } from "../../../../shared/artwork";
import type { ExhibitionDetail } from "../../../../shared/exhibition";
import type { PrintSource } from "../../../../shared/print";

export interface PrintData {
  exhibition: ExhibitionDetail;
  /** Complete records, in exhibition order. */
  artworks: Artwork[];
}

export async function loadExhibitionArtworks(
  exhibitionId: string,
): Promise<PrintData> {
  const exhibition = await window.artGallery.getExhibition(exhibitionId);
  return {
    exhibition,
    artworks: await loadArtworks(exhibition.artworks.map(({ id }) => id)),
  };
}

/** Complete records of the artworks to print, in order. */
export async function loadSourceArtworks(
  source: PrintSource,
): Promise<Artwork[]> {
  if ("exhibitionId" in source) {
    return (await loadExhibitionArtworks(source.exhibitionId)).artworks;
  }
  return loadArtworks(source.artworkIds);
}

function loadArtworks(ids: readonly string[]): Promise<Artwork[]> {
  return Promise.all(ids.map((id) => window.artGallery.getArtwork(id)));
}
