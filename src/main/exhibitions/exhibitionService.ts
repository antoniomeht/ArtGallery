import { randomUUID } from "node:crypto";
import {
  exhibitionFieldsSchema,
  type Exhibition,
  type ExhibitionDetail,
  type ExhibitionFieldsInput,
  type ExhibitionSummary,
} from "../../shared/exhibition";
import { labelTemplateSchema } from "../../shared/labels";
import type { ExhibitionRepository } from "./exhibitionRepository";

export class ExhibitionService {
  constructor(
    private readonly exhibitions: ExhibitionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): ExhibitionSummary[] {
    return this.exhibitions.listSummaries();
  }

  get(id: string): ExhibitionDetail {
    return { ...this.find(id), artworks: this.exhibitions.listArtworks(id) };
  }

  create(input: ExhibitionFieldsInput): Exhibition {
    const timestamp = this.timestamp();
    const exhibition: Exhibition = {
      ...exhibitionFieldsSchema.parse(input),
      id: randomUUID(),
      artworkIds: [],
      labelTemplate: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.exhibitions.insert(exhibition);
    return exhibition;
  }

  update(id: string, input: ExhibitionFieldsInput): Exhibition {
    const fields = exhibitionFieldsSchema.parse(input);
    if (!this.exhibitions.update(id, fields, this.timestamp())) {
      throw new Error(`Exhibition not found: ${id}`);
    }
    return this.find(id);
  }

  /** Keeps the label design for the next time its labels are printed. */
  saveLabelTemplate(id: string, input: unknown): Exhibition {
    const template = labelTemplateSchema.parse(input);
    if (!this.exhibitions.setLabelTemplate(id, template, this.timestamp())) {
      throw new Error(`Exhibition not found: ${id}`);
    }
    return this.find(id);
  }

  /** Deletes the exhibition only; its artworks stay in the inventory. */
  delete(id: string): void {
    this.exhibitions.delete(id);
  }

  /** Sets the artworks and their order, e.g. after reordering or removing. */
  setArtworks(id: string, artworkIds: readonly string[]): ExhibitionDetail {
    this.find(id);
    this.exhibitions.setArtworks(id, artworkIds, this.timestamp());
    return this.get(id);
  }

  /** Adds artworks at the end, ignoring those already included. */
  addArtworks(id: string, artworkIds: readonly string[]): ExhibitionDetail {
    const { artworkIds: current } = this.find(id);
    return this.setArtworks(id, [...current, ...artworkIds]);
  }

  listAll(): Exhibition[] {
    return this.exhibitions.listAll();
  }

  private find(id: string): Exhibition {
    const exhibition = this.exhibitions.findById(id);
    if (!exhibition) throw new Error(`Exhibition not found: ${id}`);
    return exhibition;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
