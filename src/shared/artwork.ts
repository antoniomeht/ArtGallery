import { z } from "zod";

export const newArtworkSchema = z.object({
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().max(300).optional(),
  imagePaths: z.array(z.string().min(1)).max(50),
});

export type NewArtwork = z.input<typeof newArtworkSchema>;

export interface ArtworkSummary {
  id: string;
  title: string;
  artist: string | null;
  /** First image of the artwork, used as its cover. */
  primaryImageId: string | null;
  createdAt: string;
}
