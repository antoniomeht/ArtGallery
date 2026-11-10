import { randomUUID } from "node:crypto";
import type { CollectionService } from "../collections/collectionService";
import { rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Artwork } from "../../shared/artwork";
import type {
  DuplicatePolicy,
  ExportResult,
  ImportPreviewResult,
  ImportResult,
} from "../../shared/transfer";
import type { ExhibitionService } from "../exhibitions/exhibitionService";
import type { ImageStore } from "../images/imageStore";
import type { InventoryService } from "../inventory/inventoryService";
import { toExportArtwork } from "../package/exportArtwork";
import type { PackageCollection } from "../package/packageFormat";
import { PackageError } from "../package/packageFormat";
import { readPackage, type ValidatedPackage } from "../package/readPackage";
import { restoredArtworks } from "../package/restoredArtworks";
import { writePackage } from "../package/writePackage";
import { toCsv } from "./csv";
import { planImport, resolveImport, type ImportPlan } from "./importPlan";

export interface TransferServiceOptions {
  inventory: InventoryService;
  exhibitions: ExhibitionService;
  collections: CollectionService;
  images: ImageStore;
  /** Scratch space where packages are validated before importing. */
  workDir: string;
  appVersion: string;
  now?: () => Date;
}

interface ImportSession {
  pkg: ValidatedPackage;
  plan: ImportPlan;
}

/** Exports artworks to packages or CSV and imports packages. */
export class TransferService {
  private readonly sessions = new Map<string, ImportSession>();
  private readonly now: () => Date;

  constructor(private readonly options: TransferServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  /** `ids` null means every artwork outside the trash. */
  async exportPackage(
    destination: string,
    ids: readonly string[] | null,
  ): Promise<ExportResult> {
    const artworks = this.artworksToExport(ids);
    await writePackage(destination, {
      kind: "artworks",
      artworks: artworks.map((artwork) =>
        toExportArtwork(artwork, this.options.images),
      ),
      collections: this.collectionsOf(artworks),
      appVersion: this.options.appVersion,
      now: this.now(),
    });
    return { path: destination, artworks: artworks.length };
  }

  /** Exports an exhibition with its artworks outside the trash. */
  async exportExhibition(
    destination: string,
    exhibitionId: string,
  ): Promise<ExportResult> {
    const exhibition = this.options.exhibitions.get(exhibitionId);
    const artworkIds = exhibition.artworks.map(({ id }) => id);
    const { artworks, ...rest } = exhibition;
    await writePackage(destination, {
      kind: "artworks",
      artworks: this.artworksToExport(artworkIds).map((artwork) =>
        toExportArtwork(artwork, this.options.images),
      ),
      exhibitions: [{ ...rest, artworkIds }],
      collections: this.collectionsOf(this.artworksToExport(artworkIds)),
      appVersion: this.options.appVersion,
      now: this.now(),
    });
    return { path: destination, artworks: artworks.length };
  }

  async exportCsv(
    destination: string,
    ids: readonly string[] | null,
  ): Promise<ExportResult> {
    const artworks = this.artworksToExport(ids);
    const csv = toCsv(artworks, (artworkId) =>
      this.options.collections
        .listForArtwork(artworkId)
        .map((collection) => collection.name),
    );
    await writeFile(destination, csv, "utf8");
    return { path: destination, artworks: artworks.length };
  }

  /**
   * Validates the whole package and reports what importing it would do.
   * Nothing is written to the inventory until `applyImport`.
   */
  async previewImport(path: string): Promise<ImportPreviewResult> {
    const sessionId = randomUUID();
    let pkg: ValidatedPackage;
    try {
      pkg = await readPackage(path, this.stagingDir(sessionId));
    } catch (error) {
      if (error instanceof PackageError)
        return { ok: false, reason: error.code };
      throw error;
    }
    const { inventory } = this.options;
    const plan = planImport(pkg.data, {
      artworkIds: inventory.artworkIds(),
      exhibitionIds: inventory.exhibitionIds(),
    });
    this.sessions.set(sessionId, { pkg, plan });
    return {
      ok: true,
      preview: {
        sessionId,
        fileName: basename(path),
        newCount: plan.fresh.length,
        duplicates: plan.duplicates.map(({ id, title }) => ({ id, title })),
        trashedSkipped: plan.trashedSkipped,
        newExhibitions: plan.freshExhibitions.length,
        duplicateExhibitions: plan.duplicateExhibitions.map(({ id, name }) => ({
          id,
          name,
        })),
      },
    };
  }

  async applyImport(
    sessionId: string,
    policy: DuplicatePolicy,
  ): Promise<ImportResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown import session: ${sessionId}`);
    try {
      const { artworks, exhibitions, collections, ...counts } = resolveImport(
        session.plan,
        policy,
        { newId: randomUUID, now: this.now() },
      );
      await this.options.inventory.importArtworks(
        restoredArtworks(session.pkg, artworks),
        exhibitions,
      );
      // A collection with the same name, ignoring case and accents, is reused.
      for (const { name, artworkIds } of collections) {
        const collection = this.options.collections.findOrCreate(name);
        this.options.collections.setMembership(collection.id, artworkIds, true);
      }
      return { ...counts, exhibitions: exhibitions.length };
    } finally {
      await this.cancelImport(sessionId);
    }
  }

  /** Discards a previewed package and its extracted files. */
  async cancelImport(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await rm(this.stagingDir(sessionId), { recursive: true, force: true });
  }

  /** Collections of the exported artworks, holding only those artworks. */
  private collectionsOf(artworks: readonly Artwork[]): PackageCollection[] {
    const exported = new Set(artworks.map(({ id }) => id));
    return this.options.collections
      .listRecords()
      .map((collection) => ({
        ...collection,
        artworkIds: collection.artworkIds.filter((id) => exported.has(id)),
      }))
      .filter(({ artworkIds }) => artworkIds.length > 0);
  }

  private artworksToExport(ids: readonly string[] | null): Artwork[] {
    const { inventory } = this.options;
    const artworks = ids
      ? ids.map((id) => inventory.getArtwork(id))
      : inventory.listAllArtworks();
    return artworks.filter((artwork) => !artwork.deletedAt);
  }

  private stagingDir(sessionId: string): string {
    return join(this.options.workDir, `import-${sessionId}`);
  }
}
