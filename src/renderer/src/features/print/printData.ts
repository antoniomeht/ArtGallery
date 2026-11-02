import type { Artwork } from "../../../../shared/artwork";
import type { ExhibitionDetail } from "../../../../shared/exhibition";

export interface PrintData {
  exhibition: ExhibitionDetail;
  /** Complete records, in exhibition order. */
  artworks: Artwork[];
}

export async function loadExhibitionArtworks(
  exhibitionId: string,
): Promise<PrintData> {
  const exhibition = await window.artGallery.getExhibition(exhibitionId);
  const artworks = await Promise.all(
    exhibition.artworks.map(({ id }) => window.artGallery.getArtwork(id)),
  );
  return { exhibition, artworks };
}
