import { z } from "zod";
import type { ArtworkSummary } from "./artwork";
import { optionalDate, optionalText } from "./fields";
import type { LabelTemplate } from "./labels";

export const exhibitionBaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  venue: optionalText(200),
  startDate: optionalDate,
  endDate: optionalDate,
  description: optionalText(5000),
});

export const exhibitionFieldsSchema = exhibitionBaseSchema.refine(
  ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
  { message: "The exhibition ends before it starts", path: ["endDate"] },
);

export type ExhibitionFieldsInput = z.input<typeof exhibitionFieldsSchema>;
export type ExhibitionFields = z.output<typeof exhibitionFieldsSchema>;

export interface Exhibition extends ExhibitionFields {
  id: string;
  /** Artworks in the order chosen for the exhibition. */
  artworkIds: string[];
  /** The design of its labels; null until one is saved. */
  labelTemplate: LabelTemplate | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExhibitionSummary {
  id: string;
  name: string;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  artworkCount: number;
  /** Primary image of the first artwork, used as a cover. */
  coverImageId: string | null;
}

/** An exhibition with its artworks in order, ready to show. */
export interface ExhibitionDetail extends Exhibition {
  /** Artworks outside the trash, in exhibition order. */
  artworks: ArtworkSummary[];
}
