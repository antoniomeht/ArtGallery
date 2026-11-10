import { randomUUID } from "node:crypto";
import { sortKey } from "../database/sortKey";
import {
  collectionNameSchema,
  type CollectionSummary,
  type DeletedCollection,
} from "../../shared/collection";
import type {
  CollectionRecord,
  CollectionRepository,
} from "./collectionRepository";

/** Compares names as the database does: ignoring case and accents. */
const sameKey = (a: string, b: string) => sortKey(a) === sortKey(b);

export class CollectionNameTakenError extends Error {
  constructor() {
    super("Collection name taken");
  }
}

export class CollectionService {
  constructor(
    private readonly collections: CollectionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): CollectionSummary[] {
    return this.collections.list();
  }

  listForArtwork(artworkId: string): CollectionSummary[] {
    return this.collections.listForArtwork(artworkId);
  }

  create(name: string): CollectionSummary {
    const id = randomUUID();
    const available = this.availableName(name, null);
    this.collections.insert(id, available, this.timestamp());
    return this.find(id);
  }

  rename(id: string, name: string): CollectionSummary {
    const available = this.availableName(name, id);
    if (!this.collections.rename(id, available, this.timestamp())) {
      throw new Error(`Collection not found: ${id}`);
    }
    return this.find(id);
  }

  /** Deletes the collection only; its artworks stay in the inventory. */
  delete(id: string): DeletedCollection {
    const deleted = this.collections.delete(id);
    if (!deleted) throw new Error(`Collection not found: ${id}`);
    return deleted;
  }

  restore(deleted: DeletedCollection): void {
    this.collections.restore(deleted, this.timestamp());
  }

  setMembership(
    id: string,
    artworkIds: readonly string[],
    member: boolean,
  ): void {
    this.find(id);
    this.collections.setMembership(id, artworkIds, member, this.timestamp());
  }

  /** Every collection with its members, for backups and exports. */
  listRecords(): CollectionRecord[] {
    return this.collections.listRecords();
  }

  replaceAll(collections: readonly CollectionRecord[]): void {
    this.collections.replaceAll(collections);
  }

  /** The collection with this name, ignoring case and accents, or a new one. */
  findOrCreate(name: string): CollectionSummary {
    const existing = this.list().find((collection) =>
      sameKey(collection.name, name),
    );
    return existing ?? this.create(name);
  }

  private availableName(name: string, exceptId: string | null): string {
    const parsed = collectionNameSchema.parse(name);
    if (this.collections.isNameTaken(parsed, exceptId)) {
      throw new CollectionNameTakenError();
    }
    return parsed;
  }

  private find(id: string): CollectionSummary {
    const collection = this.collections.find(id);
    if (!collection) throw new Error(`Collection not found: ${id}`);
    return collection;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
