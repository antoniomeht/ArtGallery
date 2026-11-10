import { z } from "zod";

export const collectionNameSchema = z.string().trim().min(1).max(100);

export interface CollectionSummary {
  id: string;
  name: string;
  /** Artworks outside the trash. */
  artworkCount: number;
}

/** What deleting a collection removed, so it can be restored. */
export interface DeletedCollection {
  id: string;
  name: string;
  artworkIds: string[];
  createdAt: string;
}
